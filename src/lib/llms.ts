import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { feedPath } from "@/lib/site";

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
