import * as Sentry from "@sentry/nextjs";
import { POSTHOG_RELAY, posthogUiHost } from "@/lib/posthog";

// Error tracking, only when a DSN is configured. Loaded up front so it also
// catches errors that happen while the page starts. No session replay.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Product analytics (TRD 2.2): PostHog, only when a key is configured. Loaded
// lazily so it never blocks interactivity. Funnel events are sent via track().
// Cookieless: PostHog counts visitors with a daily-salted hash on its servers,
// and the browser stores nothing. Errors go to Sentry, not PostHog.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: POSTHOG_RELAY,
      ui_host: posthogUiHost(),
      cookieless_mode: "always",
      capture_pageview: "history_change",
      capture_performance: { web_vitals: true },
      capture_exceptions: false,
      disable_session_recording: true,
    });
    (window as unknown as { posthog?: typeof posthog }).posthog = posthog;
  });
}
