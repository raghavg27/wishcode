import { type NextRequest } from "next/server";
import { parseSort, parseStatus } from "@/lib/config";
import { getLedgerPage, getLiveMetoos, withLiveCounts } from "@/lib/data";

// GET /api/wishes?status=&sort=&cursor= — cursor-paginated ledger feed.
// Me-too counts are live; also returns which of the wishes this browser has me-too'd.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const status = parseStatus(sp.get("status"));
  const sort = parseSort(sp.get("sort"));
  try {
    const page = await getLedgerPage(status, sort, sp.get("cursor"));
    const live = await getLiveMetoos(page.items.map((w) => w.id));
    return Response.json({ ...page, items: withLiveCounts(page.items, live), viewerMetoos: live.mine }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[api/wishes]", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
