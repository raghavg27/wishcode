// Funnel: land → post → me-too → claim → link → share (TRD 2.2). Share
// moments: share_moment_shown → share { card } → a visit to the card's page.
export type FunnelEvent =
  | "wish_posted"
  | "duplicate_shown"
  | "duplicate_metoo"
  | "metoo"
  | "claim"
  | "link_posted"
  | "verdict"
  | "email_opt_in"
  | "share"
  | "share_moment_shown"
  | "github_connect_started";

export function track(event: FunnelEvent, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    (window as unknown as { posthog?: { capture: (e: string, p?: object) => void } }).posthog?.capture(
      event,
      properties,
    );
  } catch {
    // Analytics must never break the app.
  }
}
