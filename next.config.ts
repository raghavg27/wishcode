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
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  outputFileTracingIncludes: {
    "/api/og/wish/[id]": ["./assets/fonts/**"],
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

export default nextConfig;
