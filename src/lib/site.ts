import type { Sort, StatusFilter } from "@/lib/config";

// Absolute site URL for share links, OG images and OAuth redirects.
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Where people can chip in for hosting. */
export const SUPPORT_URL = "https://buymeacoffee.com/raghavg27";

export function wishPath(id: number | string) {
  return `/w/${id}`;
}

/** The wishes feed with a filter, sort and page cursor; defaults are left out. */
export function feedPath(status: StatusFilter, sort: Sort, cursor?: string | null) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (sort !== "newest") params.set("sort", sort);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `/wishes?${qs}` : "/wishes";
}

export function developerPath(handle: string) {
  return `/d/${encodeURIComponent(handle)}`;
}

export function wishLabel(id: number | string) {
  return `#WISH-${id}`;
}

/** Parses a /w/:id path segment. */
export function parseWishId(raw: string): number | null {
  if (!/^[1-9][0-9]{0,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * GitHub's avatar CDN, the only place avatars load from (matches the
 * developers.avatar_url check). Any other host would see every visitor's IP,
 * and the share-card routes fetch avatars server-side.
 */
export function isGithubAvatar(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https:\/\/avatars\.githubusercontent\.com\//.test(url);
}

/** GitHub handle syntax, as used in /d/:handle. */
export const GITHUB_HANDLE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
