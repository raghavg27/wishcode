import { getDeveloperProfile } from "@/lib/data";

// GET /api/developers/:handle — public developer profile.
export async function GET(_request: Request, { params }: RouteContext<"/api/developers/[handle]">) {
  const handle = decodeURIComponent((await params).handle);
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(handle)) return Response.json({ error: "not_found" }, { status: 404 });
  try {
    const profile = await getDeveloperProfile(handle);
    if (!profile) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(profile, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } });
  } catch (err) {
    console.error("[api/developers/:handle]", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
