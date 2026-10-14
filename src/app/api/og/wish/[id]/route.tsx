import { getWish } from "@/lib/data";
import { domainOf, formatNumber } from "@/lib/format";
import { Avatar, CRAFT, Chip, Dot, Footer, Frame, INK, Wordmark, avatarDataUrl, cardResponse, notFound, quoteSize } from "@/lib/og-card";
import { peopleCount } from "@/lib/share-copy";
import { parseWishId } from "@/lib/site";

// GET /api/og/wish/:id — the wish's 1200×630 share card (PRD F8). The page
// links it with a ?v= that changes with everything shown, so CDN caching is safe.

const STATUS = {
  open: { label: "Open", bg: "#f5ece8", fg: "#1e1b19", border: "#e0d8d5" },
  being_built: { label: "Being built", bg: "#fffbeb", fg: "#904d00", border: "#fde68a" },
  fulfilled: { label: "Fulfilled ✓", bg: "#f0fdf4", fg: "#00743a", border: "#bbf7d0" },
  fulfilled_unverified: { label: "Fulfilled · unverified", bg: "#fff3e0", fg: "#835400", border: "#f5c97a" },
} as const;

export async function GET(_request: Request, { params }: RouteContext<"/api/og/wish/[id]">) {
  const id = parseWishId((await params).id);
  const wish = id ? await getWish(id).catch(() => null) : null;
  if (!wish || wish.removed || !wish.text) return notFound();

  // first_link is the first link that isn't flagged.
  const link = wish.status === "fulfilled" ? wish.first_link : null;
  const avatar = await avatarDataUrl(link?.developer.avatar_url);
  const status = STATUS[wish.status === "fulfilled" && !wish.verified ? "fulfilled_unverified" : wish.status];

  return cardResponse(
    <Frame>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <Chip {...status} />
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", fontFamily: "Newsreader", fontSize: quoteSize(wish.text), lineHeight: 1.25, color: INK, letterSpacing: -1 }}>
        “{wish.text}”
      </div>

      <Footer wishId={wish.id}>
        {link ? (
          <>
            <Avatar src={avatar} size={40} />
            <span>Fulfilled by</span>
            <span style={{ fontWeight: 700, color: INK }}>@{link.developer.handle}</span>
            <Dot />
            <span style={{ color: CRAFT }}>{domainOf(link.url)}</span>
          </>
        ) : (
          <span style={{ fontWeight: 700, color: CRAFT }}>{formatNumber(peopleCount(wish.metoo_count))} people want this</span>
        )}
      </Footer>
    </Frame>,
  );
}
