import * as Sentry from "@sentry/nextjs";

// Error tracking on the server and in proxy.ts, only when a DSN is configured.
// The browser side is set up in instrumentation-client.ts.
export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1,
  });
}

// Errors thrown while rendering, in Server Actions, route handlers and proxy.ts.
export const onRequestError = Sentry.captureRequestError;
