import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_CARD, developerSchema, faqSchema, jsonLd, pageMetadata, wishSchema } from "../seo";
import type { DeveloperProfile, DeveloperRef, WishDetail, WishLink } from "../types";

beforeEach(() => vi.stubEnv("SITE_URL", "https://wishcode.example"));
afterEach(() => vi.unstubAllEnvs());

const dev: DeveloperRef = { id: "d1", handle: "priya", avatar_url: null };

function link(overrides: Partial<WishLink>): WishLink {
  return {
    id: 1,
    url: "https://barkmute.app",
    description: "Mutes the dog",
    repo_url: null,
    created_at: "2026-10-02T00:00:00Z",
    verdict: "unverified",
    works_count: 0,
    broken_count: 0,
    wisher_verdict: null,
    developer: dev,
    ...overrides,
  };
}

function wish(links: WishLink[]): WishDetail & { text: string } {
  return {
    id: 7,
    text: "An app that mutes my neighbour's dog",
    status: links.length ? "fulfilled" : "open",
    verified: false,
    metoo_count: 12,
    claim_count: 0,
    link_count: links.length,
    live_link_count: links.length,
    created_at: "2026-10-01T00:00:00Z",
    fulfilled_at: null,
    removed: false,
    first_link: null,
    builders: [],
    links,
    claims: [],
  };
}

describe("jsonLd", () => {
  it("escapes < so wish text can't close the script tag", () => {
    const out = jsonLd({ text: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).text).toBe("</script><script>alert(1)</script>");
  });
});

describe("pageMetadata", () => {
  it("sets the canonical, og:url and the default card", () => {
    const meta = pageMetadata({ title: "About", description: "Why", path: "/about" });
    expect(meta.title).toBe("About");
    expect(meta.alternates?.canonical).toBe("/about");
    expect(meta.openGraph).toMatchObject({ title: "About", url: "/about", siteName: "Wishcode", images: [SITE_CARD] });
    expect(meta.twitter).toMatchObject({ title: "About", images: [SITE_CARD.url] });
  });

  it("leaves the title to the layout default when omitted", () => {
    const meta = pageMetadata({ description: "Home", path: "/" });
    expect(meta).not.toHaveProperty("title");
    expect(meta.openGraph?.title).toBe("Wishcode: app ideas people wish existed");
  });
});

describe("wishSchema", () => {
  it("describes the wish with absolute URLs", () => {
    const [post, crumbs] = wishSchema(wish([]));
    expect(post).toMatchObject({
      "@type": "DiscussionForumPosting",
      url: "https://wishcode.example/w/7",
      headline: "An app that mutes my neighbour's dog",
      interactionStatistic: { userInteractionCount: 12 },
    });
    expect(post).not.toHaveProperty("sharedContent");
    expect(crumbs.itemListElement.at(-1)).toMatchObject({ name: "#WISH-7", item: "https://wishcode.example/w/7" });
  });

  it("lists live links and leaves flagged ones out", () => {
    const [post] = wishSchema(wish([link({ id: 1 }), link({ id: 2, url: "https://scam.example", verdict: "flagged" })]));
    expect(post.sharedContent).toEqual([
      expect.objectContaining({ url: "https://barkmute.app", author: expect.objectContaining({ url: "https://wishcode.example/d/priya" }) }),
    ]);
  });
});

describe("developerSchema", () => {
  it("adds a breadcrumb trail through the builders directory", () => {
    const [page, crumbs] = developerSchema({ handle: "priya", avatar_url: null, joined_at: "2026-10-01T00:00:00Z" } as DeveloperProfile);
    expect(page).toMatchObject({ "@type": "ProfilePage", url: "https://wishcode.example/d/priya" });
    expect(crumbs.itemListElement).toEqual([
      expect.objectContaining({ position: 1, name: "Wishcode", item: "https://wishcode.example/" }),
      expect.objectContaining({ position: 2, name: "Builders", item: "https://wishcode.example/developers" }),
      expect.objectContaining({ position: 3, name: "@priya", item: "https://wishcode.example/d/priya" }),
    ]);
  });
});

describe("faqSchema", () => {
  it("turns each question into a Question with its answer", () => {
    const schema = faqSchema([{ question: "Is it free?", answer: "Yes." }]);
    expect(schema).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Is it free?", acceptedAnswer: { "@type": "Answer", text: "Yes." } }],
    });
  });
});
