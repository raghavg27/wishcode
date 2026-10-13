// Absolute site URL for share links, OG images and OAuth redirects.
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function wishPath(id: number | string) {
  return `/w/${id}`;
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

/** GitHub handle syntax, as used in /d/:handle. */
export const GITHUB_HANDLE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
