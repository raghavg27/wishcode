import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getWish, parseWishId } from "@/lib/data";
import { domainOf, formatNumber } from "@/lib/format";
import { siteUrl, wishPath } from "@/lib/site";

// GET /api/og/wish/:id — 1200×630 share card (PRD F8). The page links it with
// a ?v= that changes with status/links/me-toos, so CDN caching is safe.

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Newsreader-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
]);

const STATUS = {
  open: { label: "Open", bg: "#f5ece8", fg: "#1e1b19", border: "#e0d8d5" },
  being_built: { label: "Being built", bg: "#fffbeb", fg: "#904d00", border: "#fde68a" },
  fulfilled: { label: "Fulfilled", bg: "#f0fdf4", fg: "#00743a", border: "#bbf7d0" },
} as const;

async function avatarDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const src = new URL(url);
    src.searchParams.set("s", "96");
    const res = await fetch(src, { signal: AbortSignal.timeout(2500) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: RouteContext<"/api/og/wish/[id]">) {
  const id = parseWishId((await params).id);
  const wish = id ? await getWish(id).catch(() => null) : null;
  if (!wish || wish.removed || !wish.text) return new Response("Not found", { status: 404 });

  const [[serif, sans, sansBold], avatar] = await Promise.all([fonts, avatarDataUrl(wish.first_link?.developer.avatar_url)]);
  const status = STATUS[wish.status];
  const host = new URL(siteUrl()).host;
  const fontSize = wish.text.length > 140 ? 48 : wish.text.length > 90 ? 56 : 64;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fff8f5", padding: 64, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f5a524", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#14110f" }}>
              W
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "#1e1b19" }}>WISHCODE PUBLIC LEDGER</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", borderRadius: 999, background: status.bg, color: status.fg, border: `2px solid ${status.border}`, fontSize: 24, fontWeight: 700 }}>
            {wish.status === "fulfilled" ? "✓ " : ""}
            {status.label}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", fontFamily: "Newsreader", fontSize, lineHeight: 1.25, color: "#1e1b19", letterSpacing: -1 }}>
          “{wish.text}”
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #eae4da", paddingTop: 28, fontSize: 26, color: "#524434" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", fontWeight: 700, color: "#835400" }}>✋ {formatNumber(wish.metoo_count)} me-toos</div>
            {wish.first_link && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#d7c3ae" }}>•</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
                {avatar && <img src={avatar} width={40} height={40} style={{ borderRadius: 999 }} alt="" />}
                <span>Fulfilled by</span>
                <span style={{ fontWeight: 700, color: "#1e1b19" }}>@{wish.first_link.developer.handle}</span>
                <span style={{ color: "#d7c3ae" }}>•</span>
                <span style={{ color: "#835400" }}>{domainOf(wish.first_link.url)}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", color: "#857462" }}>
            {host}
            {wishPath(wish.id)}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Newsreader", data: serif, weight: 500, style: "normal" },
        { name: "Inter", data: sans, weight: 500, style: "normal" },
        { name: "Inter", data: sansBold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
