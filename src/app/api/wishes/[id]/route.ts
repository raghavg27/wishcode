import { getWish } from "@/lib/data";
import { parseWishId } from "@/lib/site";

// GET /api/wishes/:id — a wish with its claims and links.
export async function GET(_request: Request, { params }: RouteContext<"/api/wishes/[id]">) {
  const id = parseWishId((await params).id);
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });
  try {
    const wish = await getWish(id);
    if (!wish) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(wish, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("[api/wishes/:id]", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
