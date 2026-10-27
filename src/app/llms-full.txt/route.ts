import { getLedgerPage } from "@/lib/data";
import { llmsFullTxt, TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/site";

// GET /llms-full.txt — how the site works, plus the most-wanted and newest wishes.
export async function GET() {
  const [top, newest] = await Promise.all([
    getLedgerPage("all", "top", null).catch(() => null),
    getLedgerPage("all", "newest", null).catch(() => null),
  ]);
  const text = llmsFullTxt(siteUrl(), { top: top?.items ?? null, newest: newest?.items ?? null });
  return new Response(text, { headers: TEXT_HEADERS });
}
