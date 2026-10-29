import type { Metadata } from "next";
import { developerPath, isGithubAvatar, siteUrl, wishLabel, wishPath } from "@/lib/site";
import type { DeveloperProfile, WishDetail } from "@/lib/types";

// Metadata from different segments merges shallowly: a page that sets
// openGraph replaces the layout's whole object. Pages build theirs here so
// each one keeps the site name, type and default card.

export const SITE_NAME = "Wishcode";
export const DEFAULT_TITLE = "Wishcode: app ideas people wish existed";
export const SITE_DESCRIPTION = 
  "Post an app idea you wish existed. No signup. See how many people want the same thing, and developers build it and share the link.";

/** The default 1200×630 share card, for pages without one of their own. */
export const SITE_CARD = { url: "/api/og/site", width: 1200, height: 630, alt: "Wishcode: I wish there was an app that…" };

export const OPEN_GRAPH_BASE = { type: "website", siteName: SITE_NAME, locale: "en_US" } as const;

type PageMeta = {
  /** Page title, before the "· Wishcode" template. Omit for the site default. */
  title?: string;
  description: string;
  /** Canonical path, e.g. "/about". */
  path: string;
  /** Share card; the site card when omitted. */
  image?: string;
};

export function pageMetadata({ title, description, path, image }: PageMeta): Metadata {
  const ogTitle = title ?? DEFAULT_TITLE;
  const images = image ? [{ url: image, width: 1200, height: 630, alt: ogTitle }] : [SITE_CARD];
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_BASE, title: ogTitle, description, url: path, images },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: images.map((i) => i.url) },
  };
}

/**
 * A JSON-LD payload safe to put in a <script>: "<" is escaped so text from
 * a wish can't close the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Structured data (schema.org JSON-LD). URLs are absolute: crawlers read the
// script without resolving it against the page.

export function siteSchema() {
  const url = siteUrl();
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url, description: SITE_DESCRIPTION },
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url, logo: `${url}/icon-512.png` },
  ];
}

export function faqSchema(faq: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/** A wish as a forum post: wishers are anonymous, me-toos are likes, live links are what was shared in reply. */
export function wishSchema(wish: WishDetail & { text: string }) {
  const base = siteUrl();
  const url = `${base}${wishPath(wish.id)}`;
  const links = wish.links.filter((l) => l.verdict !== "flagged");
  const post = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": url,
    url,
    headline: wish.text,
    text: wish.text,
    datePublished: wish.created_at,
    author: { "@type": "Person", name: "Anonymous" },
    interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: wish.metoo_count },
    ...(links.length > 0 && {
      sharedContent: links.map((l) => ({
        "@type": "WebPage",
        url: l.url,
        ...(l.description && { description: l.description }),
        datePublished: l.created_at,
        author: { "@type": "Person", name: `@${l.developer.handle}`, url: `${base}${developerPath(l.developer.handle)}` },
      })),
    }),
  };
  const breadcrumbs = breadcrumbSchema([
    ["App ideas", "/wishes"],
    [wishLabel(wish.id), wishPath(wish.id)],
  ]);
  return [post, breadcrumbs] as const;
}

/** A trail from the home page through each [name, path], the last being the page itself. */
function breadcrumbSchema(trail: [name: string, path: string][]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [[SITE_NAME, "/"], ...trail].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${base}${path}`,
    })),
  };
}

export function developerSchema(profile: DeveloperProfile) {
  const path = developerPath(profile.handle);
  const url = `${siteUrl()}${path}`;
  const page = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    dateCreated: profile.joined_at,
    mainEntity: {
      "@type": "Person",
      name: `@${profile.handle}`,
      alternateName: profile.handle,
      url,
      ...(isGithubAvatar(profile.avatar_url) && { image: profile.avatar_url }),
      sameAs: [`https://github.com/${profile.handle}`],
    },
  };
  const breadcrumbs = breadcrumbSchema([
    ["Builders", "/developers"],
    [`@${profile.handle}`, path],
  ]);
  return [page, breadcrumbs] as const;
}
