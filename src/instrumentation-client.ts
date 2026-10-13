// Product analytics (TRD 2.2): PostHog, only when a key is configured. Loaded
// lazily so it never blocks interactivity. Funnel events are sent via track().
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: "history_change",
      persistence: "memory",
      disable_session_recording: true,
    });
    (window as unknown as { posthog?: typeof posthog }).posthog = posthog;
  });
}
