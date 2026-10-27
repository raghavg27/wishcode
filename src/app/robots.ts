import type { MetadataRoute } from "next";
import { POSTHOG_RELAY } from "@/lib/posthog";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Previews are copies of production; Vercel also sends noindex for them.
  if (process.env.VERCEL_ENV === "preview") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        // Share cards live under /api/og. Twitterbot won't fetch an image robots.txt blocks.
        allow: ["/", "/api/og/"],
        disallow: ["/api/", "/auth/", "/login", "/admin", "/e/", `${POSTHOG_RELAY}/`, "/monitoring"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
