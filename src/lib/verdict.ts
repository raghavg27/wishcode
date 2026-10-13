import type { LinkVerdict } from "@/lib/types";

// Mirrors private.refresh_link_verdict so the client can update a link's
// state right away. The database stays the source of truth.

export const VERDICT_THRESHOLD = 3;

export function computeVerdict(wisherVerdict: boolean | null, worksCount: number, brokenCount: number): LinkVerdict {
  if (wisherVerdict !== null) return wisherVerdict ? "verified" : "flagged";
  if (worksCount >= VERDICT_THRESHOLD && worksCount > brokenCount) return "verified";
  if (brokenCount >= VERDICT_THRESHOLD && brokenCount >= worksCount) return "flagged";
  return "unverified";
}

/** "3 say it works · 1 says it doesn't", or null when nobody has voted. */
export function verdictCountsText(worksCount: number, brokenCount: number): string | null {
  const parts: string[] = [];
  if (worksCount > 0) parts.push(`${worksCount} ${worksCount === 1 ? "says" : "say"} it works`);
  if (brokenCount > 0) parts.push(`${brokenCount} ${brokenCount === 1 ? "says" : "say"} it doesn't`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
