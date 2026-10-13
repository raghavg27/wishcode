import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MetooButton } from "@/components/metoo";
import { ShareIconButton } from "@/components/share";
import { TimeAgo } from "@/components/time-ago";
import { Avatar, StatusChip } from "@/components/ui";
import { domainOf, pluralize } from "@/lib/format";
import { developerPath, wishPath } from "@/lib/site";
import type { WishCard as Wish } from "@/lib/types";

export const EXTERNAL_REL = "noopener noreferrer nofollow ugc";

export function WishCard({ wish, metooActive }: { wish: Wish; metooActive: boolean }) {
  const href = wishPath(wish.id);
  const text = wish.text ?? "";
  const moreLinks = wish.link_count - 1;

  return (
    <article className="card group relative p-5 transition-shadow duration-200 hover:shadow-card-hover sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <TimeAgo iso={wish.created_at} prefix="posted" className="text-caption text-outline" />
        <StatusChip status={wish.status} verified={wish.verified} />
      </div>

      <h2 className="my-3 font-serif text-wish-sm text-ink sm:text-wish">
        <Link href={href} className="decoration-amber/60 decoration-2 underline-offset-4 hover:underline">
          {text}
        </Link>
      </h2>

      {wish.status === "fulfilled" && wish.first_link && (
        <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-ink-muted">
            <Avatar dev={wish.first_link.developer} size={24} />
            <span>
              Fulfilled by{" "}
              <Link href={developerPath(wish.first_link.developer.handle)} className="font-semibold text-ink hover:underline">
                @{wish.first_link.developer.handle}
              </Link>{" "}
              <TimeAgo iso={wish.first_link.created_at} />
            </span>
            {moreLinks > 0 && (
              <>
                <span className="text-outline" aria-hidden>
                  ·
                </span>
                <Link href={`${href}#links`} className="text-outline underline decoration-dotted hover:text-ink">
                  +{pluralize(moreLinks, "more link")}
                </Link>
              </>
            )}
          </div>
          <a
            href={wish.first_link.url}
            target="_blank"
            rel={EXTERNAL_REL}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1 text-label-sm font-medium text-ink shadow-card transition-colors hover:bg-surface"
          >
            Open app
            <ArrowUpRight className="size-3.5" aria-hidden />
            <span className="truncate text-caption text-outline">{domainOf(wish.first_link.url)}</span>
          </a>
        </div>
      )}

      {wish.status === "being_built" && wish.builders.length > 0 && (
        <div className="my-4 flex items-center gap-3">
          <div className="flex -space-x-2">
            {wish.builders.map((b) => (
              <Avatar key={b.id} dev={b} size={24} className="ring-2 ring-surface-lowest" />
            ))}
          </div>
          <p className="min-w-0 text-label-sm text-ink-muted">
            <strong className="font-medium text-ink">{pluralize(wish.claim_count, "developer")}</strong> building (
            {wish.builders.map((b, i) => (
              <span key={b.id}>
                {i > 0 && ", "}
                <Link href={developerPath(b.handle)} className="hover:underline">
                  @{b.handle}
                </Link>
              </span>
            ))}
            {wish.claim_count > wish.builders.length && ", …"})
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <MetooButton wishId={wish.id} active={metooActive} count={wish.metoo_count} />
        <ShareIconButton path={href} text={`I wish there was an app: “${text}”`} />
      </div>
    </article>
  );
}
