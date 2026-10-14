import { getWish } from "@/lib/data";
import { domainOf } from "@/lib/format";
import { Avatar, CRAFT, Dot, Footer, Frame, INK, MUTED, Stamp, Wordmark, avatarDataUrl, cardResponse, notFound, quoteSize } from "@/lib/og-card";
import { confirmedStamp, wisherCardLink } from "@/lib/share-copy";
import { parseWishId } from "@/lib/site";

// GET /api/og/wish/:id/came-true — the wisher's "My wish came true" card,
// crediting the earliest link the wisher confirmed. ?v= is that link's id.

export async function GET(_request: Request, { params }: RouteContext<"/api/og/wish/[id]/came-true">) {
  const id = parseWishId((await params).id);
  const wish = id ? await getWish(id).catch(() => null) : null;
  const link = wish ? wisherCardLink(wish.links) : undefined;
  if (!wish || wish.removed || !wish.text || !link) return notFound();

  const avatar = await avatarDataUrl(link.developer.avatar_url);

  return cardResponse(
    <Frame>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <Stamp text={confirmedStamp(link)} />
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", gap: 28 }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2.5, color: INK }}>
          My wish came true.
        </div>
        <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: quoteSize(wish.text, true), lineHeight: 1.3, color: MUTED }}>
          “{wish.text}”
        </div>
      </div>

      <Footer wishId={wish.id}>
        <span>Built by</span>
        <Avatar src={avatar} size={40} />
        <span style={{ fontWeight: 700, color: INK }}>@{link.developer.handle}</span>
        <Dot />
        <span style={{ color: CRAFT }}>{domainOf(link.url)}</span>
      </Footer>
    </Frame>,
  );
}
