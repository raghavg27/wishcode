// Deterministic formatting helpers (safe on server and client).

const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Short repo label, e.g. github.com/priya/barkmute. */
export function repoLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

export function relativeTime(iso: string, now: number): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (days < 30) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  if (days < 365) return months <= 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function durationBetween(fromIso: string, toIso: string): string {
  const hours = Math.max(0, (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

export function resetsIn(resetAt: string, now: number): string {
  const minutes = Math.max(1, Math.round((new Date(resetAt).getTime() - now) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

/** "12% more wishes than last week", or null with no previous week to compare. */
export function weekDeltaText(wishes: number, wishesPrev: number): string | null {
  if (wishesPrev <= 0) return null;
  const delta = Math.round(((wishes - wishesPrev) / wishesPrev) * 100);
  if (delta === 0) return "Same as last week";
  return `${Math.abs(delta)}% ${delta > 0 ? "more" : "fewer"} wishes than last week`;
}
