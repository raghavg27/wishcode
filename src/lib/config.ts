// Product constants from the v1 PRD/TRD. Shared by client and server.

export const WISH_MIN = 20;
export const WISH_MAX = 200;
export const LINK_DESCRIPTION_MAX = 140;
export const URL_MAX = 2048;
export const EMAIL_MAX = 254;

// Rate limits. Daily windows reset at midnight UTC.
export const LIMITS = {
  wishesPerDevicePerDay: 2,
  /**
   * Network = salted IP hash. Offices, campuses and mobile carriers put many
   * people behind one IP, so network caps are looser abuse backstops.
   */
  wishesPerNetworkPerDay: 20,
  metoosPerDevicePerDay: 100,
  metoosPerNetworkPerDay: 1000,
  linksPerDeveloperPerDay: 20,
  /** Many developers can claim one wish; this caps new claims per developer. */
  claimsPerDeveloperPerDay: 5,
  /** Caps embedding calls (Edge Function CPU time) from one IP. */
  duplicateChecksPerIpPerHour: 60,
  /** New email subscriptions (re-subscribing an active address is free). */
  subscriptionsPerDevicePerDay: 20,
  subscriptionsPerNetworkPerDay: 100,
  /** New reports (reporting the same wish or link again is free). */
  reportsPerDevicePerDay: 20,
  reportsPerNetworkPerDay: 200,
} as const;

/** Turnstile widget action for posting a wish; the server checks tokens carry it. */
export const POST_WISH_ACTION = "post_wish";

/** Most reported targets shown on /admin at once. */
export const REPORT_QUEUE_SIZE = 100;

/**
 * Cosine similarity (gte-small) at or above this counts as a likely duplicate.
 * On sample wishes, paraphrases scored 0.886–0.955 and related-but-different
 * wishes 0.855–0.901. A false positive costs one "Post mine anyway" tap, so
 * this leans toward catching duplicates.
 */
export const DUPLICATE_THRESHOLD = 0.89;
export const DUPLICATE_LIMIT = 3;

export const FEED_PAGE_SIZE = 20;

export const DISCLAIMER = "I do not check links before they go up.";

/** Shown above a wish's links. */
export const LINKS_DISCLAIMER =
  "I do not check links before they go up. The people who wanted this wish vote on whether each one works.";

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
