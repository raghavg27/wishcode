import type { MetadataRoute } from "next";
import { POSTHOG_RELAY } from "@/lib/posthog";
import { siteUrl } from "@/lib/site";

// AI search, answer and training crawlers. They already fall under "*"; a
// group of their own says so explicitly. A crawler with its own group ignores
// "*", so the group repeats the same paths.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "cohere-ai",
  "MistralAI-User",
];

const PATHS = {
  // Share cards live under /api/og. Twitterbot won't fetch an image robots.txt blocks.
  allow: ["/", "/api/og/"],
  disallow: ["/api/", "/auth/", "/login", "/admin", "/e/", `${POSTHOG_RELAY}/`, "/monitoring"],
};

export default function robots(): MetadataRoute.Robots {
  // Previews are copies of production; Vercel also sends noindex for them.
  if (process.env.VERCEL_ENV === "preview") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", ...PATHS },
      { userAgent: AI_CRAWLERS, ...PATHS },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
