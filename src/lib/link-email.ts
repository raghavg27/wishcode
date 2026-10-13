// The "someone built it" email. Pure so it can be unit-tested; the mailer
// and the subscriber list live in src/lib/notify.ts.

export type LinkEmailInput = {
  wishText: string;
  /** Absolute URL of the wish page; email links share its origin. */
  wishUrl: string;
  linkId: number;
  linkUrl: string;
  description: string;
  handle: string;
  isWisher: boolean;
  /** Signed subscription token (src/lib/email-token.ts). */
  token: string;
};

export type LinkEmail = {
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailUrls(origin: string, token: string, linkId: number) {
  const t = encodeURIComponent(token);
  return {
    yes: `${origin}/e/verdict?t=${t}&link=${linkId}&works=1`,
    no: `${origin}/e/verdict?t=${t}&link=${linkId}&works=0`,
    unsubscribe: `${origin}/e/unsubscribe?t=${t}`,
    unsubscribeAll: `${origin}/e/unsubscribe?t=${t}&all=1`,
  };
}

export function buildLinkEmail(input: LinkEmailInput): LinkEmail {
  const { wishText, wishUrl, linkId, linkUrl, description, handle, isWisher, token } = input;
  const urls = emailUrls(new URL(wishUrl).origin, token, linkId);
  const subject = isWisher ? "Someone built your wish" : "Someone built a wish you wanted";
  const intro = isWisher ? "You wished for:" : "You wanted:";

  const text = [
    intro,
    `“${wishText}”`,
    "",
    `@${handle} built it:`,
    description,
    linkUrl,
    "",
    "Does it work?",
    `Yes: ${urls.yes}`,
    `No: ${urls.no}`,
    "",
    `See the wish: ${wishUrl}`,
    "",
    "--",
    `Stop emails for this wish: ${urls.unsubscribe}`,
    `Stop all Wishcode emails: ${urls.unsubscribeAll}`,
  ].join("\n");

  const e = escapeHtml;
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${e(href)}" style="display:inline-block;padding:10px 20px;margin-right:8px;border-radius:8px;font-weight:600;text-decoration:none;${
      primary ? "background:#f5a524;color:#14110f;" : "background:#f5ece8;color:#1e1b19;"
    }">${label}</a>`;

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#fff8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1e1b19;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eae4da;border-radius:12px;padding:28px;">
<p style="margin:0 0 8px;font-size:14px;color:#524434;">${intro}</p>
<blockquote style="margin:0 0 24px;padding:0 0 0 16px;border-left:3px solid #f5a524;font-family:Georgia,serif;font-size:20px;line-height:28px;">“${e(wishText)}”</blockquote>
<p style="margin:0 0 4px;font-size:15px;"><strong>@${e(handle)}</strong> built it:</p>
<p style="margin:0 0 8px;font-size:15px;line-height:22px;">${e(description)}</p>
<p style="margin:0 0 24px;font-size:14px;"><a href="${e(linkUrl)}" style="color:#835400;word-break:break-all;">${e(linkUrl)}</a></p>
<p style="margin:0 0 12px;font-size:15px;font-weight:600;">Does it work?</p>
<p style="margin:0 0 24px;">${button(urls.yes, "Yes", true)}${button(urls.no, "No", false)}</p>
<p style="margin:0;font-size:14px;"><a href="${e(wishUrl)}" style="color:#835400;">See the wish on Wishcode</a></p>
</div>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#857462;text-align:center;">
<a href="${e(urls.unsubscribe)}" style="color:#857462;">Stop emails for this wish</a> · <a href="${e(urls.unsubscribeAll)}" style="color:#857462;">Stop all Wishcode emails</a>
</p>
</body>
</html>`;

  return {
    subject,
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${urls.unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
