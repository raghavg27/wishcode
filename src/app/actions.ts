"use server";

import { revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { DUPLICATE_LIMIT, DUPLICATE_THRESHOLD, LIMITS } from "@/lib/config";
import { tags } from "@/lib/data";
import { embed } from "@/lib/embeddings";
import { toActionError, type ActionError } from "@/lib/errors";
import { clientIpKey, ensureDeviceHash } from "@/lib/identity";
import { db } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { SimilarWish, WishStatus } from "@/lib/types";
import { normalizeWishText, validateLinkInput, wishTextIssue } from "@/lib/validation";

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

    // Embedding calls cost money: cap them per IP and fall back to trigram
    // matching (no embedding) past the cap instead of failing.
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
      p_ip_limit: LIMITS.wishesPerIpPerDay,
    });
    if (error) return toActionError(error, "wish");

    updateTag(tags.ledger);
    revalidateTag(tags.stats, "max");
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
      p_ip_limit: LIMITS.metoosPerIpPerDay,
    });
    if (error) return toActionError(error, "metoo");

    // Me-toos are high volume: serve stale and refresh in the background
    // rather than forcing a recompute on every tap.
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
  revalidateTag(tags.stats, "max");
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

export type PostLinkResult = { ok: true; linkId: number; status: WishStatus } | ActionError;

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
    return { ok: true, linkId: Number(result.id), status: result.status };
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
// Session
// ---------------------------------------------------------------------------

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}
