// The "your build was verified" email to a developer. Pure so it can be
// unit-tested; the mailer and the claim live in src/lib/notify.ts.

import { escapeHtml } from "@/lib/link-email";
import { confirmedStamp } from "@/lib/share-copy";

export type VerifiedEmailInput = {
  wishText: string;
  /** Absolute URL of the wish page; email links share its origin. */
  wishUrl: string;
  /** Absolute URL of the developer's share page for this wish. */
  shareUrl: string;
  linkUrl: string;
  wisherVerdict: boolean;
  worksCount: number;
  /** Signed link token (src/lib/email-token.ts). */
  token: string;
};

export type VerifiedEmail = {
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
};

export function buildVerifiedEmail(input: VerifiedEmailInput): VerifiedEmail {
  const { wishText, wishUrl, shareUrl, linkUrl, wisherVerdict, worksCount, token } = input;
  const stop = `${new URL(wishUrl).origin}/e/unsubscribe?d=${encodeURIComponent(token)}`;
  const stamp = confirmedStamp({ verdict: "verified", wisher_verdict: wisherVerdict, works_count: worksCount });
  const subject = "Your build was verified";

  const text = [
    "You built:",
    `“${wishText}”`,
    linkUrl,
    "",
    stamp,
    "",
    `Share it: ${shareUrl}`,
    `See the wish: ${wishUrl}`,
    "",
    "--",
    `Stop all Wishcode emails: ${stop}`,
  ].join("\n");

  const e = escapeHtml;
  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#fff8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1e1b19;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eae4da;border-radius:12px;padding:28px;">
<p style="margin:0 0 8px;font-size:14px;color:#524434;">You built:</p>
<blockquote style="margin:0 0 12px;padding:0 0 0 16px;border-left:3px solid #f5a524;font-family:Georgia,serif;font-size:20px;line-height:28px;">“${e(wishText)}”</blockquote>
<p style="margin:0 0 24px;font-size:14px;"><a href="${e(linkUrl)}" style="color:#835400;word-break:break-all;">${e(linkUrl)}</a></p>
<p style="margin:0 0 24px;font-size:17px;font-weight:600;">${e(stamp ?? "")}</p>
<p style="margin:0 0 24px;"><a href="${e(shareUrl)}" style="display:inline-block;padding:10px 20px;border-radius:8px;font-weight:600;text-decoration:none;background:#f5a524;color:#14110f;">Share it</a></p>
<p style="margin:0;font-size:14px;"><a href="${e(wishUrl)}" style="color:#835400;">See the wish on Wishcode</a></p>
</div>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#857462;text-align:center;">
<a href="${e(stop)}" style="color:#857462;">Stop all Wishcode emails</a>
</p>
</body>
</html>`;

  return {
    subject,
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${stop}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
