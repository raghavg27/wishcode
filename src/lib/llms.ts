import { PRINCIPLES } from "@/lib/principles";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { feedPath, wishPath } from "@/lib/site";
import type { WishCard } from "@/lib/types";

// Plain-text guides for language models, served at /llms.txt and
// /llms-full.txt (https://llmstxt.org). URLs are absolute: models read the
// file on its own, without a page to resolve links against.

export const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" };

const SUMMARY =
  "Wishcode is a public list of app wishes. A wish is one sentence about an app that does not exist yet, such as “An app that mutes my mic when the dog starts barking.” Each wish shows how many people want the app, which developers are building it and the live links they post. The people who wanted the app vote on whether a link works.";

function pages(base: string) {
  return [
    `- [Home](${base}/): what Wishcode is, with a prompt to make a wish`,
    `- [All wishes](${base}${feedPath("all", "newest")}): every app idea, newest first`,
    `- [Most-wanted wishes](${base}${feedPath("all", "top")}): app ideas sorted by me-too count`,
    `- [Open wishes](${base}${feedPath("open", "newest")}): app ideas nobody has built yet`,
    `- [Fulfilled wishes](${base}${feedPath("fulfilled", "newest")}): app ideas with a live app`,
    `- [Builders](${base}/developers): developers who build wishes`,
    `- [How it works](${base}/principles): the rules for wishes, claims, links and votes`,
    `- [About](${base}/about): why Wishcode exists and who runs it`,
  ].join("\n");
}

export function llmsTxt(base: string): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SUMMARY}

## Pages

${pages(base)}

## Optional

- [Full guide for language models](${base}/llms-full.txt): how Wishcode works, plus current wishes
- [Privacy](${base}/privacy)
- [Terms](${base}/terms)
- [Sitemap](${base}/sitemap.xml): every wish and builder page
`;
}

const STEPS = `1. **Make a wish.** Complete the sentence “I wish there was an app that…”. No account is needed.
2. **Add a me-too.** Each me-too shows developers how many people want the app.
3. **Build it.** A developer connects GitHub, claims the wish and posts a live link.
4. **Verify it.** The people who want the app try the link. If the wisher says Yes, or 3 people who gave it a me-too say Yes, the wish shows Fulfilled ✓.`;

const STATUS_LABELS: Record<WishCard["status"], string> = {
  open: "open",
  being_built: "being built",
  fulfilled: "fulfilled",
};

function wishLine(base: string, wish: WishCard) {
  const status = wish.status === "fulfilled" && !wish.verified ? "fulfilled, unverified" : STATUS_LABELS[wish.status];
  const metoos = `${wish.metoo_count} ${wish.metoo_count === 1 ? "me-too" : "me-toos"}`;
  // Wish text is user input: keep it on one line and out of the link syntax.
  const text = (wish.text ?? "").replace(/\s+/g, " ").replace(/[[\]\\]/g, "\\$&");
  return `- [${text}](${base}${wishPath(wish.id)}): ${metoos}, ${status}`;
}

function wishSection(base: string, heading: string, wishes: WishCard[] | null) {
  const listed = (wishes ?? []).filter((w) => !w.removed && w.text);
  if (listed.length === 0) return "";
  return `\n## ${heading}\n\n${listed.map((w) => wishLine(base, w)).join("\n")}\n`;
}

/** llms.txt plus the rules and the current wishes. Null wishes leave their section out. */
export function llmsFullTxt(base: string, wishes: { top: WishCard[] | null; newest: WishCard[] | null }): string {
  const principles = PRINCIPLES.map((p) => `### ${p.title}\n\n${p.body}`).join("\n\n");
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SUMMARY}

## How it works

${STEPS}

## Principles

${principles}

## Privacy

Wishers have no account: their device gets a random token, and Wishcode stores only its hash. Wishcode does not store raw IP addresses; it counts actions per network with a salted hash of the IP, and those counters expire within a day. An email address is optional and used only to say when a wish is built. Developers sign in with GitHub.

## URLs

- Wish: ${base}${wishPath(":id")}, for example ${base}${wishPath(1)}
- Builder profile: ${base}/d/:github-handle

## Pages

${pages(base)}
- [Privacy](${base}/privacy)
- [Terms](${base}/terms)
- [Sitemap](${base}/sitemap.xml): every wish and builder page
${wishSection(base, "Most-wanted app ideas", wishes.top)}${wishSection(base, "Newest app ideas", wishes.newest)}`;
}
