// Maps database errors (SQLSTATE P0001 with a stable message) to results the
// UI can show. Anything unexpected is logged and reported generically.

import { LIMITS } from "@/lib/config";

export type ActionError = {
  ok: false;
  code:
    | "invalid"
    | "rate_limited"
    | "not_found"
    | "wish_removed"
    | "already_linked"
    | "forbidden"
    | "unauthenticated"
    | "not_eligible"
    | "invalid_email"
    | "suppressed"
    | "invalid_token"
    | "bot_check_failed"
    | "unavailable";
  message: string;
  /** ISO time when a rate limit resets. */
  resetAt?: string;
  fields?: Record<string, string>;
};

type PgError = { code?: string; message?: string; details?: string | null };

const RESETS = "The limit resets at midnight UTC.";

const RATE_LIMIT_MESSAGES: Record<string, Record<string, string>> = {
  wish: {
    device: `You have posted ${LIMITS.wishesPerDevicePerDay} wishes today. ${RESETS}`,
    ip: `Your network has posted ${LIMITS.wishesPerNetworkPerDay} wishes today. ${RESETS}`,
  },
  metoo: {
    device: `You have given ${LIMITS.metoosPerDevicePerDay} me-toos today. ${RESETS}`,
    ip: `Your network has given ${LIMITS.metoosPerNetworkPerDay} me-toos today. ${RESETS}`,
  },
  link: { developer: `You have posted ${LIMITS.linksPerDeveloperPerDay} links today. ${RESETS}` },
  claim: { developer: `You have claimed ${LIMITS.claimsPerDeveloperPerDay} wishes today. ${RESETS}` },
  verdict: {},
  subscribe: {
    device: `You have turned on emails for ${LIMITS.subscriptionsPerDevicePerDay} wishes today. ${RESETS}`,
    ip: `Your network has turned on emails for ${LIMITS.subscriptionsPerNetworkPerDay} wishes today. ${RESETS}`,
  },
  unsubscribe: {},
  report: {
    device: `You have sent ${LIMITS.reportsPerDevicePerDay} reports today. ${RESETS}`,
    ip: `Your network has sent ${LIMITS.reportsPerNetworkPerDay} reports today. ${RESETS}`,
  },
  reportLink: {
    device: `You have sent ${LIMITS.reportsPerDevicePerDay} reports today. ${RESETS}`,
    ip: `Your network has sent ${LIMITS.reportsPerNetworkPerDay} reports today. ${RESETS}`,
  },
  moderate: {},
};

export function toActionError(err: unknown, action: keyof typeof RATE_LIMIT_MESSAGES): ActionError {
  const e = (err ?? {}) as PgError;
  if (e.code === "P0001") {
    switch (e.message) {
      case "rate_limited": {
        const [scope, resetAt] = (e.details ?? "").split("|");
        return {
          ok: false,
          code: "rate_limited",
          message: RATE_LIMIT_MESSAGES[action]?.[scope] ?? "You are going a bit fast. Try again later.",
          resetAt,
        };
      }
      case "not_found":
        return {
          ok: false,
          code: "not_found",
          message: action === "verdict" || action === "reportLink" ? "That link was removed." : "That wish does not exist.",
        };
      case "wish_removed":
        return { ok: false, code: "wish_removed", message: "This wish was removed." };
      case "already_linked":
        return {
          ok: false,
          code: "already_linked",
          message: "You have already posted a link on this wish. Remove it to post a new one.",
        };
      case "forbidden":
        return { ok: false, code: "forbidden", message: "You cannot do that." };
      case "not_eligible":
        return {
          ok: false,
          code: "not_eligible",
          message: action === "subscribe" ? "Tap Me too first to get emails." : "Only people who wanted this can vote.",
        };
      case "invalid_email":
        return { ok: false, code: "invalid_email", message: "That email address does not look right." };
      case "suppressed":
        return {
          ok: false,
          code: "suppressed",
          message: "This address has turned off all Wishcode emails.",
        };
      case "invalid_text":
        return { ok: false, code: "invalid", message: "A wish needs 20 to 200 characters." };
    }
  }
  if (e.code === "23514") {
    return { ok: false, code: "invalid", message: "Some of what you entered is not right." };
  }
  if (e.code === "23505" && action === "link") {
    // Lost a race against our own concurrent submit: the unique index caught it.
    return toActionError({ code: "P0001", message: "already_linked" }, "link");
  }
  console.error(`[${action}] unexpected error`, err);
  return { ok: false, code: "unavailable", message: "Something went wrong on our side. Please try again." };
}
