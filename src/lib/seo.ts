import type { Metadata } from "next";

// Metadata from different segments merges shallowly: a page that sets
// openGraph replaces the layout's whole object. Pages build theirs here so
// each one keeps the site name, type and default card.

export const SITE_NAME = "Wishcode";
export const DEFAULT_TITLE = "Wishcode — app ideas people wish existed";
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
  const images = image ? [{ url: image, width: 1200, height: 630 }] : [SITE_CARD];
  const ogTitle = title ?? DEFAULT_TITLE;
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
