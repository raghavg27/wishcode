// Only same-site relative paths are allowed as post-login destinations, so the
// OAuth round-trip cannot be turned into an open redirect.
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string" || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  try {
    const url = new URL(raw, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
