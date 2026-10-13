// Product constants from the v1 PRD/TRD. Shared by client and server.

export const WISH_MIN = 20;
export const WISH_MAX = 200;
export const LINK_DESCRIPTION_MAX = 140;
export const URL_MAX = 2048;

export const LIMITS = {
  /** PRD F10: per device. */
  wishesPerDevicePerDay: 5,
  metoosPerDevicePerDay: 200,
  /** PRD F10: per developer. */
  linksPerDeveloperPerDay: 20,
  /**
   * Not in the PRD. Device tokens are free to mint (clear cookies), so a
   * coarse per-IP ceiling backs up the device limits. Kept generous because
   * offices, campuses and mobile carriers share IPs.
   */
  wishesPerIpPerDay: 50,
  metoosPerIpPerDay: 2000,
  /** Anti-abuse only; claiming itself has no limit on open claims. */
  claimsPerDeveloperPerDay: 200,
  /** Caps embedding calls (which cost money) from one IP. */
  duplicateChecksPerIpPerHour: 60,
} as const;

/** TRD 2.5: cosine similarity at or above this counts as a likely duplicate. */
export const DUPLICATE_THRESHOLD = 0.88;
export const DUPLICATE_LIMIT = 3;

export const FEED_PAGE_SIZE = 20;

export const DISCLAIMER = "Wishcode doesn't check or vouch for linked apps.";

export const STATUS_FILTERS = ["all", "open", "being_built", "fulfilled"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const SORTS = ["newest", "top"] as const;
export type Sort = (typeof SORTS)[number];

export function parseStatus(value: unknown): StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

export function parseSort(value: unknown): Sort {
  return SORTS.includes(value as Sort) ? (value as Sort) : "newest";
}
