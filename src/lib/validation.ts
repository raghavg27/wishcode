// Input validation shared by the client (inline hints) and the server (the
// source of truth). Lengths are counted in Unicode code points to match
// Postgres char_length().

import { LINK_DESCRIPTION_MAX, URL_MAX, WISH_MAX, WISH_MIN } from "./config";

// Control characters except tab/newline, plus bidi overrides that can be used
// to visually spoof text.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

export function charLength(value: string): number {
  return Array.from(value).length;
}

/** Trim, strip unsafe characters and collapse all whitespace to single spaces. */
export function normalizeWishText(raw: string): string {
  return raw.normalize("NFC").replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim();
}

export type WishTextIssue = "too_short" | "too_long" | null;

export function wishTextIssue(normalized: string): WishTextIssue {
  const n = charLength(normalized);
  if (n < WISH_MIN) return "too_short";
  if (n > WISH_MAX) return "too_long";
  return null;
}

export function normalizeLine(raw: string): string {
  return raw.normalize("NFC").replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim();
}

export type UrlIssue = "required" | "too_long" | "not_https" | "invalid";

/** TRD 2.6: parses, https only, under 2,048 chars. Nothing is fetched. */
export function urlIssue(raw: string, { required = true } = {}): UrlIssue | null {
  const value = raw.trim();
  if (!value) return required ? "required" : null;
  if (value.length > URL_MAX) return "too_long";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return /^https?:\/\//i.test(value) || !value.includes(".") ? "invalid" : "not_https";
  }
  if (url.protocol !== "https:") return url.protocol === "http:" ? "not_https" : "invalid";
  if (!url.hostname.includes(".") || url.username || url.password) return "invalid";
  if (/\s/.test(value)) return "invalid";
  return null;
}

export const URL_ISSUE_MESSAGES: Record<UrlIssue, string> = {
  required: "Add the URL where the app lives.",
  too_long: "That URL is longer than 2,048 characters.",
  not_https: "Links must start with https://",
  invalid: "That doesn't look like a valid URL.",
};

export type LinkInput = { url: string; description: string; repoUrl: string | null };

export type LinkIssues = Partial<Record<"url" | "description" | "repoUrl", string>>;

export function validateLinkInput(raw: { url: string; description: string; repoUrl?: string | null }): {
  value: LinkInput;
  issues: LinkIssues;
} {
  const url = raw.url.trim();
  const description = normalizeLine(raw.description);
  const repoUrl = (raw.repoUrl ?? "").trim() || null;
  const issues: LinkIssues = {};

  const u = urlIssue(url);
  if (u) issues.url = URL_ISSUE_MESSAGES[u];

  const d = charLength(description);
  if (d < 1) issues.description = "Add a one-line description.";
  else if (d > LINK_DESCRIPTION_MAX) issues.description = `Keep it to ${LINK_DESCRIPTION_MAX} characters.`;

  if (repoUrl) {
    const r = urlIssue(repoUrl, { required: false });
    if (r) issues.repoUrl = r === "not_https" ? "Repo links must start with https://" : URL_ISSUE_MESSAGES[r];
  }

  return { value: { url, description, repoUrl }, issues };
}
