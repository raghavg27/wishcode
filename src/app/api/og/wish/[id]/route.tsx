import { getWish } from "@/lib/data";
import { domainOf, formatNumber } from "@/lib/format";
import { Avatar, CRAFT, Chip, Dot, Footer, Frame, INK, Wordmark, avatarDataUrl, cardResponse, notFound, quoteSize } from "@/lib/og-card";
import { peopleCount } from "@/lib/share-copy";
import { parseWishId } from "@/lib/site";

// GET /api/og/wish/:id — the wish's 1200×630 share card (PRD F8). The page
// links it with a ?v= that changes with everything shown, so CDN caching is safe.

const STATUS = {
  open: { label: "Open", bg: "#2a2856", fg: "#e0deec", border: "#3a3870" },
  being_built: { label: "Being built", bg: "#3b2a35", fg: "#fbd9c4", border: "#6b3f2f" },
  fulfilled: { label: "Fulfilled ✓", bg: "#1f3b45", fg: "#9be3bb", border: "#2c6b5a" },
  fulfilled_unverified: { label: "Fulfilled · unverified", bg: "#353145", fg: "#f4b740", border: "#6a5a3a" },
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
