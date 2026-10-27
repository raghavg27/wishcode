import { TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/site";

// GET /ai.txt — Spawning's ai.txt: AI datasets may use everything on the site.
export function GET() {
  const text = `# Wishcode allows AI training on all of its public content.
# A guide for language models: ${siteUrl()}/llms.txt

User-Agent: *
Allow: /
`;
  return new Response(text, { headers: TEXT_HEADERS });
}
