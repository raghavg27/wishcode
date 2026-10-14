import { formatNumber } from "@/lib/format";
import { wishPath } from "@/lib/site";
import type { WishLink } from "@/lib/types";

// Copy and URLs for share cards (/api/og/*) and the share moments. Pure, so
// pages, OG routes, the proxy and client components agree.

export type CardKind = "wish" | "developer" | "wisher";

/** From this many people, the developer headline names the count. */
export const HEADLINE_MIN_PEOPLE = 5;

/** Everyone who wished for it: the me-toos plus the wisher (who can't me-too). */
export function peopleCount(metooCount: number) {
  return metooCount + 1;
}

export function developerHeadline(people: number) {
  return people >= HEADLINE_MIN_PEOPLE
    ? `I built what ${formatNumber(people)} people wished for.`
    : "I made someone's wish come true.";
}

/** The card's "✓ Confirmed" stamp. Nothing negative is ever printed on a card. */
export function confirmedStamp(link: Pick<WishLink, "verdict" | "wisher_verdict" | "works_count">): string | null {
  if (link.verdict !== "verified") return null;
  return link.wisher_verdict ? "✓ Confirmed by the wisher" : `✓ Confirmed by ${formatNumber(link.works_count)} people`;
}

/** Post text; share targets append the URL. */
export function shareText({
  variant,
  wishText,
  people,
  handle,
}: {
  variant: "developer" | "wisher";
  wishText: string;
  people: number;
  handle: string;
}) {
  if (variant === "wisher") return `My wish came true: “${wishText}”, built by @${handle}`;
  return `${developerHeadline(people).slice(0, -1)}: “${wishText}”`;
}

export function cardFilename(wishId: number, handle?: string) {
  return handle ? `wishcode-${wishId}-${handle}.png` : `wishcode-${wishId}.png`;
}

type CardLink = Pick<WishLink, "id" | "created_at" | "verdict" | "wisher_verdict" | "works_count" | "developer">;

/** The handle's link on a wish, unless it was flagged. */
export function liveLinkBy<T extends CardLink>(links: T[], handle: string): T | undefined {
  const wanted = handle.toLowerCase();
  return links.find((l) => l.verdict !== "flagged" && l.developer.handle.toLowerCase() === wanted);
}

/**
 * The link the wisher card credits: the earliest one the wisher confirmed.
 * `confirming` counts a link the wisher is voting Yes on right now.
 */
export function wisherCardLink<T extends CardLink>(links: T[], confirming?: number): T | undefined {
  return links
    .filter((l) => l.wisher_verdict === true || l.id === confirming)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)[0];
}

// Page URLs: each card has its own page so link previews pick it up.

export function developerSharePath(wishId: number, handle: string) {
  return `${wishPath(wishId)}/by/${encodeURIComponent(handle)}`;
}

export function cameTruePath(wishId: number) {
  return `${wishPath(wishId)}/came-true`;
}

// Card image URLs. ?v= changes with everything the card shows, so CDNs and
// link previews can cache each version for good.

export function wishCardSrc(wish: { id: number; status: string; verified: boolean; link_count: number; metoo_count: number }) {
  return `/api/og/wish/${wish.id}?v=${wish.status}-${wish.verified ? 1 : 0}-${wish.link_count}-${wish.metoo_count}`;
}

export function developerCardSrc(
  link: { id: number; verdict: string; works_count?: number; wisher_verdict?: boolean | null },
  metooCount: number,
) {
  const verdict = link.verdict === "verified" && link.wisher_verdict ? "wisher" : link.verdict;
  return `/api/og/link/${link.id}?v=${verdict}-${link.works_count ?? 0}-${metooCount}`;
}

export function wisherCardSrc(wishId: number, linkId: number) {
  return `/api/og/wish/${wishId}/came-true?v=${linkId}`;
}

/** Everything a share moment needs, built on the server. */
export type ShareMomentProps = {
  card: "developer" | "wisher";
  path: string;
  text: string;
  image: string;
  filename: string;
};

export function developerShare(
  wish: { id: number; text: string; metoo_count: number },
  link: { id: number; verdict: string; works_count?: number; wisher_verdict?: boolean | null; developer: { handle: string } },
): ShareMomentProps {
  return {
    card: "developer",
    path: developerSharePath(wish.id, link.developer.handle),
    text: shareText({ variant: "developer", wishText: wish.text, people: peopleCount(wish.metoo_count), handle: link.developer.handle }),
    image: developerCardSrc(link, wish.metoo_count),
    filename: cardFilename(wish.id, link.developer.handle),
  };
}

export function wisherShare(wish: { id: number; text: string; metoo_count: number }, link: { id: number; developer: { handle: string } }): ShareMomentProps {
  return {
    card: "wisher",
    path: cameTruePath(wish.id),
    text: shareText({ variant: "wisher", wishText: wish.text, people: peopleCount(wish.metoo_count), handle: link.developer.handle }),
    image: wisherCardSrc(wish.id, link.id),
    filename: cardFilename(wish.id, link.developer.handle),
  };
}
