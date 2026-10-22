import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// The no-JS sign-in form redirects through Supabase Auth to GitHub, so both
// must be allowed as form targets.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: `frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://github.com ${supabaseOrigin}; object-src 'none'` },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // PostHog's API paths end in "/", so the relay needs them kept. proxy.ts
  // still redirects pages with a trailing slash.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  outputFileTracingIncludes: {
    "/api/og/wish/[id]": ["./assets/fonts/**"],
    "/api/og/wish/[id]/came-true": ["./assets/fonts/**"],
    "/api/og/link/[linkId]": ["./assets/fonts/**"],
  },
  // The wishes feed lived at / before the landing page; keep its filter links working.
  async redirects() {
    return ["status", "sort"].map((key) => ({
      source: "/",
      has: [{ type: "query" as const, key }],
      destination: "/wishes",
      permanent: false,
    }));
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT
// are set. Browser errors go through /monitoring so ad blockers don't drop them.
export default withSentryConfig(nextConfig, {
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  silent: !process.env.CI,
  telemetry: false,
});
