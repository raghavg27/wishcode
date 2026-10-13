// Funnel: land → post → me-too → claim → link → share (TRD 2.2).
export type FunnelEvent =
  | "wish_posted"
  | "duplicate_shown"
  | "duplicate_metoo"
  | "metoo"
  | "claim"
  | "link_posted"
  | "share"
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
