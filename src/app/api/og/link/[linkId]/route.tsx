import { getLinkWishId, getWish } from "@/lib/data";
import { domainOf } from "@/lib/format";
import { Avatar, CRAFT, Footer, Frame, INK, MUTED, Stamp, avatarDataUrl, cardResponse, notFound, quoteSize } from "@/lib/og-card";
import { confirmedStamp, developerHeadline, peopleCount } from "@/lib/share-copy";
import { parseWishId } from "@/lib/site";

// GET /api/og/link/:linkId — the developer's "I built it" card. Pages link it
// with ?v={verdict}-{works_count}-{metoo_count} (see developerCardSrc).

export async function GET(_request: Request, { params }: RouteContext<"/api/og/link/[linkId]">) {
  const linkId = parseWishId((await params).linkId);
  const wishId = linkId ? await getLinkWishId(linkId).catch(() => null) : null;
  const wish = wishId ? await getWish(wishId).catch(() => null) : null;
  // Deleted links aren't in wish.links; flagged ones get no card.
  const link = wish?.links.find((l) => l.id === linkId);
  if (!wish || wish.removed || !wish.text || !link || link.verdict === "flagged") return notFound();

  const avatar = await avatarDataUrl(link.developer.avatar_url);

  return cardResponse(
    <Frame>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700, color: INK }}>
          <Avatar src={avatar} size={56} />@{link.developer.handle}
        </div>
        <Stamp text={confirmedStamp(link)} />
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", gap: 28 }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2.5, color: INK }}>
          {developerHeadline(peopleCount(wish.metoo_count))}
        </div>
        <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: quoteSize(wish.text, true), lineHeight: 1.3, color: MUTED }}>
          “{wish.text}”
        </div>
      </div>

      <Footer wishId={wish.id}>
        <span style={{ color: CRAFT }}>{domainOf(link.url)}</span>
      </Footer>
    </Frame>,
  );
}
