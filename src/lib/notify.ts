import "server-only";
import { buildLinkEmail } from "@/lib/link-email";
import { env } from "@/lib/env";
import { signEmailToken, signLinkToken } from "@/lib/email-token";
import { sendMail } from "@/lib/mailer";
import { developerSharePath } from "@/lib/share-copy";
import { siteUrl, wishPath } from "@/lib/site";
import { db } from "@/lib/supabase/admin";
import { buildVerifiedEmail } from "@/lib/verified-email";

type LinkNotification = {
  wish_id: number;
  wish_text: string;
  link_id: number;
  link_url: string;
  description: string;
  handle: string;
  recipients: { subscription_id: number; email: string; is_wisher: boolean }[];
};

/**
 * Emails everyone subscribed to a wish about a new link. Runs after the
 * response via after(): one email at a time, failures are logged (by
 * subscription id, never the address) and skipped. No retries.
 */
export async function notifyLinkPosted(linkId: number): Promise<void> {
  const { data, error } = await db().rpc("link_notification", { p_link_id: linkId });
  if (error) {
    console.error("[notify] link_notification failed", { linkId, code: error.code, message: error.message });
    return;
  }
  const n = data as LinkNotification | null;
  if (!n || n.recipients.length === 0) return;

  const wishUrl = `${siteUrl()}${wishPath(n.wish_id)}`;
  const secret = env.emailTokenSecret;
  for (const r of n.recipients) {
    const email = buildLinkEmail({
      wishText: n.wish_text,
      wishUrl,
      linkId: Number(n.link_id),
      linkUrl: n.link_url,
      description: n.description,
      handle: n.handle,
      isWisher: r.is_wisher,
      token: signEmailToken(Number(r.subscription_id), secret),
    });
    try {
      await sendMail({ to: r.email, ...email });
    } catch (err) {
      // SMTP errors can quote the recipient, so only log codes.
      const e = (err ?? {}) as { code?: string; responseCode?: number };
      console.error("[notify] send failed", { subscriptionId: r.subscription_id, code: e.code, responseCode: e.responseCode });
    }
  }
}

type VerifiedNotification = {
  wish_id: number;
  wish_text: string;
  link_id: number;
  link_url: string;
  handle: string;
  wisher_verdict: boolean;
  works_count: number;
  email: string;
};

/**
 * Emails the developer that their link was verified. Safe to call after
 * every vote: the RPC claims the email once per link and returns null when
 * there's nothing to send. Failures are logged by link id and not retried.
 */
export async function notifyLinkVerified(linkId: number): Promise<void> {
  const { data, error } = await db().rpc("claim_verified_notification", { p_link_id: linkId });
  if (error) {
    console.error("[notify] claim_verified_notification failed", { linkId, code: error.code, message: error.message });
    return;
  }
  const n = data as VerifiedNotification | null;
  if (!n) return;

  const origin = siteUrl();
  const email = buildVerifiedEmail({
    wishText: n.wish_text,
    wishUrl: `${origin}${wishPath(n.wish_id)}`,
    shareUrl: `${origin}${developerSharePath(Number(n.wish_id), n.handle)}`,
    linkUrl: n.link_url,
    wisherVerdict: n.wisher_verdict,
    worksCount: n.works_count,
    token: signLinkToken(Number(n.link_id), env.emailTokenSecret),
  });
  try {
    await sendMail({ to: n.email, ...email });
  } catch (err) {
    const e = (err ?? {}) as { code?: string; responseCode?: number };
    console.error("[notify] verified send failed", { linkId, code: e.code, responseCode: e.responseCode });
  }
}
