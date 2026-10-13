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
