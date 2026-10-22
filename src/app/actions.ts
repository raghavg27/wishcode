"use server";

import { revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getViewer } from "@/lib/auth";
import { DUPLICATE_LIMIT, DUPLICATE_THRESHOLD, LIMITS } from "@/lib/config";
import { tags } from "@/lib/data";
import { verifyEmailToken, verifyLinkToken } from "@/lib/email-token";
import { embed } from "@/lib/embeddings";
import { env } from "@/lib/env";
import { toActionError, type ActionError } from "@/lib/errors";
import { clientIpKey, ensureDeviceHash, readDeviceHash } from "@/lib/identity";
import { notifyLinkPosted, notifyLinkVerified } from "@/lib/notify";
import { isReportReason, type ReportReason } from "@/lib/reports";
import { db } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { LinkVerdict, SimilarWish, WishStatus } from "@/lib/types";
import { emailIssue, normalizeEmail, normalizeWishText, validateLinkInput, wishTextIssue } from "@/lib/validation";

// Every mutation is a Server Action: Next.js enforces same-origin POSTs, and
// updateTag gives the author read-your-own-writes on cached pages.

function isWishId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

const UNAUTHENTICATED: ActionError = {
  ok: false,
  code: "unauthenticated",
  message: "Connect GitHub to do that.",
};

// ---------------------------------------------------------------------------
// Wishes
// ---------------------------------------------------------------------------

export type PostWishResult =
  | { ok: true; id: number }
  | { ok: "similar"; similar: SimilarWish[] }
  | ActionError;

export async function postWish(input: { text: string; force?: boolean }): Promise<PostWishResult> {
  const text = normalizeWishText(String(input?.text ?? ""));
  const issue = wishTextIssue(text);
  if (issue) {
    return {
      ok: false,
      code: "invalid",
      message: issue === "too_short" ? "A bit more detail, at least 20 characters." : "Keep it under 200 characters.",
    };
  }

  try {
    const [deviceHash, ipKey] = await Promise.all([ensureDeviceHash(), clientIpKey()]);

    // Embedding calls use Edge Function CPU time: cap them per IP and fall
    // back to trigram matching (no embedding) past the cap instead of failing.
    const canEmbed = ipKey
      ? ((await db().rpc("consume_rate_limit", {
          p_key: `embed:${ipKey}`,
          p_limit: LIMITS.duplicateChecksPerIpPerHour,
          p_window_seconds: 3600,
        })).data ?? false)
      : true;
    const embedding = canEmbed ? await embed(text) : null;

    if (!input.force) {
      const { data, error } = await db().rpc("similar_wishes", {
        p_embedding: embedding,
        p_text: text,
        p_threshold: DUPLICATE_THRESHOLD,
        p_limit: DUPLICATE_LIMIT,
      });
      if (error) {
        // Suggestions are a convenience; never block posting on them.
        console.error("[postWish] similar_wishes failed", error);
      } else if (Array.isArray(data) && data.length > 0) {
        return { ok: "similar", similar: data as SimilarWish[] };
      }
    }

    const { data, error } = await db().rpc("create_wish", {
      p_token_hash: deviceHash,
      p_ip_key: ipKey,
      p_text: text,
      p_embedding: embedding,
      p_device_limit: LIMITS.wishesPerDevicePerDay,
      p_ip_limit: LIMITS.wishesPerNetworkPerDay,
    });
    if (error) return toActionError(error, "wish");

    updateTag(tags.ledger);
    updateTag(tags.stats);
    return { ok: true, id: Number((data as { id: number }).id) };
  } catch (err) {
    return toActionError(err, "wish");
  }
}

export type MetooResult = { ok: true; active: boolean; metooCount: number } | ActionError;

export async function setMetoo(wishId: number, active: boolean): Promise<MetooResult> {
  if (!isWishId(wishId) || typeof active !== "boolean") {
    return { ok: false, code: "invalid", message: "Invalid request." };
  }
  try {
    const [deviceHash, ipKey] = await Promise.all([ensureDeviceHash(), clientIpKey()]);
    const { data, error } = await db().rpc("set_metoo", {
      p_token_hash: deviceHash,
      p_ip_key: ipKey,
      p_wish_id: wishId,
      p_active: active,
      p_device_limit: LIMITS.metoosPerDevicePerDay,
      p_ip_limit: LIMITS.metoosPerNetworkPerDay,
    });
    if (error) return toActionError(error, "metoo");

    // Pages read me-too counts live (getLiveMetoos), so the cached feed and
    // wish entries stay warm. Only the sidebar stats are recomputed, at most
    // once per write rather than once per view.
    updateTag(tags.stats);
    revalidateTag(tags.wish(wishId), "max");
    const result = data as { active: boolean; metoo_count: number };
    return { ok: true, active: result.active, metooCount: result.metoo_count };
  } catch (err) {
    return toActionError(err, "metoo");
  }
}

// ---------------------------------------------------------------------------
// Developers
// ---------------------------------------------------------------------------

function invalidateWish(wishId: number, handle: string) {
  updateTag(tags.wish(wishId));
  updateTag(tags.ledger);
  updateTag(tags.developer(handle));
  updateTag(tags.stats);
  revalidateTag(tags.directory, "max");
}

export type ClaimResult = { ok: true; status: WishStatus; claimCount: number } | ActionError;

export async function setClaim(wishId: number, active: boolean): Promise<ClaimResult> {
  if (!isWishId(wishId) || typeof active !== "boolean") {
    return { ok: false, code: "invalid", message: "Invalid request." };
  }
  try {
    const { developer } = await getViewer();
    if (!developer) return UNAUTHENTICATED;

    const { data, error } = await db().rpc("set_claim", {
      p_developer_id: developer.id,
      p_wish_id: wishId,
      p_active: active,
      p_limit: LIMITS.claimsPerDeveloperPerDay,
    });
    if (error) return toActionError(error, "claim");

    invalidateWish(wishId, developer.handle);
    const result = data as { status: WishStatus; claim_count: number };
    return { ok: true, status: result.status, claimCount: result.claim_count };
  } catch (err) {
    return toActionError(err, "claim");
  }
}

/** `handle` builds the developer's share URL, /w/:id/by/:handle. */
export type PostLinkResult = { ok: true; linkId: number; handle: string; status: WishStatus } | ActionError;

export async function postLink(
  wishId: number,
  input: { url: string; description: string; repoUrl?: string | null },
): Promise<PostLinkResult> {
  if (!isWishId(wishId)) return { ok: false, code: "invalid", message: "Invalid request." };

  const { value, issues } = validateLinkInput({
    url: String(input?.url ?? ""),
    description: String(input?.description ?? ""),
    repoUrl: input?.repoUrl == null ? null : String(input.repoUrl),
  });
  if (Object.keys(issues).length > 0) {
    return { ok: false, code: "invalid", message: "Check the highlighted fields.", fields: issues };
  }

  try {
    const { developer } = await getViewer();
    if (!developer) return UNAUTHENTICATED;

    const { data, error } = await db().rpc("create_link", {
      p_developer_id: developer.id,
      p_wish_id: wishId,
      p_url: value.url,
      p_description: value.description,
      p_repo_url: value.repoUrl,
      p_limit: LIMITS.linksPerDeveloperPerDay,
    });
    if (error) return toActionError(error, "link");

    invalidateWish(wishId, developer.handle);
    const result = data as { id: number; status: WishStatus };
    const linkId = Number(result.id);
    // Emails go out after the response; a failure never affects the post.
    after(() => notifyLinkPosted(linkId).catch((err) => console.error("[notify] failed", { linkId, err })));
    return { ok: true, linkId, handle: developer.handle, status: result.status };
  } catch (err) {
    return toActionError(err, "link");
  }
}

export type RemoveLinkResult = { ok: true; wishId: number; status: WishStatus } | ActionError;

export async function removeLink(linkId: number): Promise<RemoveLinkResult> {
  if (!isWishId(linkId)) return { ok: false, code: "invalid", message: "Invalid request." };
  try {
    const { developer } = await getViewer();
    if (!developer) return UNAUTHENTICATED;

    const { data, error } = await db().rpc("remove_link", { p_developer_id: developer.id, p_link_id: linkId });
    if (error) return toActionError(error, "link");

    const result = data as { wish_id: number; status: WishStatus };
    invalidateWish(Number(result.wish_id), developer.handle);
    return { ok: true, wishId: Number(result.wish_id), status: result.status };
  } catch (err) {
    return toActionError(err, "link");
  }
}

// ---------------------------------------------------------------------------
// Verdicts and email
// ---------------------------------------------------------------------------

const INVALID_TOKEN: ActionError = {
  ok: false,
  code: "invalid_token",
  message: "This link has expired or is invalid.",
};

type VerdictRow = {
  link_id: number;
  wish_id: number;
  works: boolean | null;
  verdict: LinkVerdict;
  works_count: number;
  broken_count: number;
  wisher_verdict: boolean | null;
  developer_handle: string;
  wish_status: WishStatus;
};

export type VerdictResult =
  | {
      ok: true;
      wishId: number;
      works: boolean | null;
      verdict: LinkVerdict;
      worksCount: number;
      brokenCount: number;
      wisherVerdict: boolean | null;
    }
  | ActionError;

// A verdict can change the link's state and the wish's status and badge.
// A verified link may owe its developer an email; the RPC sends it once.
function applyVerdict(row: VerdictRow): VerdictResult {
  const wishId = Number(row.wish_id);
  if (row.verdict === "verified") {
    const linkId = Number(row.link_id);
    after(() => notifyLinkVerified(linkId).catch((err) => console.error("[notify] failed", { linkId, err })));
  }
  updateTag(tags.wish(wishId));
  updateTag(tags.ledger);
  updateTag(tags.developer(row.developer_handle));
  updateTag(tags.stats);
  return {
    ok: true,
    wishId,
    works: row.works,
    verdict: row.verdict,
    worksCount: row.works_count,
    brokenCount: row.broken_count,
    wisherVerdict: row.wisher_verdict,
  };
}

/** Sets (true/false) or clears (null) this browser's vote on a link. */
export async function setVerdict(linkId: number, works: boolean | null): Promise<VerdictResult> {
  if (!isWishId(linkId) || (works !== null && typeof works !== "boolean")) {
    return { ok: false, code: "invalid", message: "Invalid request." };
  }
  try {
    // A browser without a device cookie has never me-too'd or wished.
    const deviceHash = await readDeviceHash();
    if (!deviceHash) return toActionError({ code: "P0001", message: "not_eligible" }, "verdict");
    const { data, error } = await db().rpc("set_verdict", {
      p_token_hash: deviceHash,
      p_link_id: linkId,
      p_works: works,
    });
    if (error) return toActionError(error, "verdict");
    return applyVerdict(data as VerdictRow);
  } catch (err) {
    return toActionError(err, "verdict");
  }
}

export type SubscribeResult = { ok: true; subscribed: true } | ActionError;

/** Emails this address when someone posts a link on the wish. */
export async function subscribe(wishId: number, email: string): Promise<SubscribeResult> {
  if (!isWishId(wishId)) return { ok: false, code: "invalid", message: "Invalid request." };
  const address = normalizeEmail(String(email ?? ""));
  if (emailIssue(address)) {
    return toActionError({ code: "P0001", message: "invalid_email" }, "subscribe");
  }
  try {
    const [deviceHash, ipKey] = await Promise.all([readDeviceHash(), clientIpKey()]);
    if (!deviceHash) return toActionError({ code: "P0001", message: "not_eligible" }, "subscribe");
    const { error } = await db().rpc("subscribe", {
      p_token_hash: deviceHash,
      p_ip_key: ipKey,
      p_wish_id: wishId,
      p_email: address,
      p_device_limit: LIMITS.subscriptionsPerDevicePerDay,
      p_ip_limit: LIMITS.subscriptionsPerNetworkPerDay,
    });
    if (error) return toActionError(error, "subscribe");
    // Viewer state is read uncached, so there is nothing to invalidate.
    return { ok: true, subscribed: true };
  } catch (err) {
    return toActionError(err, "subscribe");
  }
}

/** A vote from an email link. Counts as the subscription's device. */
export async function emailVerdict(token: string, linkId: number, works: boolean): Promise<VerdictResult> {
  const subscriptionId = verifyEmailToken(token, env.emailTokenSecret);
  if (!subscriptionId) return INVALID_TOKEN;
  if (!isWishId(linkId) || typeof works !== "boolean") {
    return { ok: false, code: "invalid", message: "Invalid request." };
  }
  try {
    const { data, error } = await db().rpc("set_verdict_by_subscription", {
      p_subscription_id: subscriptionId,
      p_link_id: linkId,
      p_works: works,
    });
    if (error) return toActionError(error, "verdict");
    return applyVerdict(data as VerdictRow);
  } catch (err) {
    return toActionError(err, "verdict");
  }
}

export type UnsubscribeResult = { ok: true; all: boolean } | ActionError;

/** Stops emails for the token's wish, or (all) every Wishcode email. */
export async function unsubscribe(token: string, all: boolean): Promise<UnsubscribeResult> {
  const subscriptionId = verifyEmailToken(token, env.emailTokenSecret);
  if (!subscriptionId) return INVALID_TOKEN;
  try {
    const { error } = await db().rpc("unsubscribe", { p_subscription_id: subscriptionId, p_all: all === true });
    if (error) return error.message === "not_found" ? INVALID_TOKEN : toActionError(error, "unsubscribe");
    return { ok: true, all: all === true };
  } catch (err) {
    return toActionError(err, "unsubscribe");
  }
}

/** The developer email's stop link: turns off every Wishcode email. */
export async function stopDeveloperEmails(token: string): Promise<UnsubscribeResult> {
  const linkId = verifyLinkToken(token, env.emailTokenSecret);
  if (!linkId) return INVALID_TOKEN;
  try {
    const { error } = await db().rpc("suppress_developer_email", { p_link_id: linkId });
    if (error) return error.message === "not_found" ? INVALID_TOKEN : toActionError(error, "unsubscribe");
    return { ok: true, all: true };
  } catch (err) {
    return toActionError(err, "unsubscribe");
  }
}

// ---------------------------------------------------------------------------
// Reports and moderation
// ---------------------------------------------------------------------------

export type ReportResult = { ok: true } | ActionError;

/** Flags a wish, or one of its links (linkId), for an admin to review. */
export async function report(wishId: number, linkId: number | null, reason: ReportReason): Promise<ReportResult> {
  if (
    !isWishId(wishId) ||
    (linkId !== null && !isWishId(linkId)) ||
    !isReportReason(reason) ||
    (reason === "malicious_link" && linkId === null)
  ) {
    return { ok: false, code: "invalid", message: "Invalid request." };
  }
  try {
    const [deviceHash, ipKey] = await Promise.all([ensureDeviceHash(), clientIpKey()]);
    const { error } = await db().rpc("report", {
      p_token_hash: deviceHash,
      p_ip_key: ipKey,
      p_wish_id: wishId,
      p_link_id: linkId,
      p_reason: reason,
      p_device_limit: LIMITS.reportsPerDevicePerDay,
      p_ip_limit: LIMITS.reportsPerNetworkPerDay,
    });
    if (error) return toActionError(error, linkId === null ? "report" : "reportLink");
    // Reports only show on /admin, which is never cached.
    return { ok: true };
  } catch (err) {
    return toActionError(err, linkId === null ? "report" : "reportLink");
  }
}

export type ModerateResult = { ok: true } | ActionError;

/**
 * Admins only: removes a wish, or one of its links (linkId), and resolves
 * its reports; with remove false, just dismisses the reports.
 */
export async function moderate(wishId: number, linkId: number | null, remove: boolean): Promise<ModerateResult> {
  if (!isWishId(wishId) || (linkId !== null && !isWishId(linkId)) || typeof remove !== "boolean") {
    return { ok: false, code: "invalid", message: "Invalid request." };
  }
  try {
    const { developer } = await getViewer();
    if (!developer) return UNAUTHENTICATED;
    if (!developer.is_admin) return toActionError({ code: "P0001", message: "forbidden" }, "moderate");

    const { data, error } = await db().rpc("admin_resolve_reports", {
      p_developer_id: developer.id,
      p_wish_id: wishId,
      p_link_id: linkId,
      p_remove: remove,
    });
    if (error) return toActionError(error, "moderate");

    if (remove) {
      updateTag(tags.wish(wishId));
      updateTag(tags.ledger);
      updateTag(tags.stats);
      revalidateTag(tags.directory, "max");
      for (const handle of (data as { handles: string[] }).handles) updateTag(tags.developer(handle));
    }
    return { ok: true };
  } catch (err) {
    return toActionError(err, "moderate");
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}
