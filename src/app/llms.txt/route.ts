import { llmsTxt, TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/site";

// GET /llms.txt — a short guide to the site for language models.
export function GET() {
  return new Response(llmsTxt(siteUrl()), { headers: TEXT_HEADERS });
}
