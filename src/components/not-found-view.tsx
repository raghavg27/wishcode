import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Magnifier } from "@/components/doodles";
import { buttonStyles } from "@/components/ui";

type Action = { href: string; label: string };

type Copy = {
  /** Mono reference line under the doodle, e.g. "#WISH-????". */
  reference: string;
  title: string;
  body: string;
  primary: Action;
  secondary?: Action;
};

export type NotFoundKind = "page" | "wish" | "developer" | "share";

const COPY: Record<NotFoundKind, Copy> = {
  page: {
    reference: "/????",
    title: "I looked everywhere. Nothing here.",
    body: "The link might have a typo, or the page never existed.",
    primary: { href: "/", label: "Back to all wishes" },
  },
  wish: {
    reference: "#WISH-????",
    title: "No wish at this address",
    body: "Check the link for a typo. If nobody has wished for it yet, you can be the first. It takes one sentence and no account.",
    primary: { href: "/#compose", label: "Make a wish" },
    secondary: { href: "/", label: "Browse wishes" },
  },
  developer: {
    reference: "@????",
    title: "No developer by that handle",
    body: "Profiles appear once a developer connects GitHub. If they changed their GitHub handle, their profile moved with it.",
    primary: { href: "/developers", label: "See all builders" },
    secondary: { href: "/", label: "Back to all wishes" },
  },
  share: {
    reference: "/w/…/by",
    title: "This share link no longer works",
    body: "The build it pointed to was removed or flagged, or the wish hasn't been confirmed as come true yet.",
    primary: { href: "/", label: "Browse wishes" },
  },
};

// Shared 404 layout: a magnifier over nothing, then a way back to the wishes.
export function NotFoundView({ kind }: { kind: NotFoundKind }) {
  const { reference, title, body, primary, secondary } = COPY[kind];
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-[520px]">
        <div className="flex items-end gap-3 text-outline">
          <Magnifier className="size-16" />
          <span className="mb-1 font-mono text-label-sm" aria-hidden>
            {reference} · 404
          </span>
        </div>

        <p className="mt-8 text-label-sm font-semibold tracking-wider text-primary uppercase">Nothing here</p>
        <h1 className="mt-2 font-serif text-display-sm text-ink">{title}</h1>
        <p className="mt-3 text-[15px] leading-6 text-ink-muted">{body}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={primary.href} className={buttonStyles.amber}>
            {primary.label} <ArrowRight className="size-4" aria-hidden />
          </Link>
          {secondary && (
            <Link href={secondary.href} className={buttonStyles.quiet}>
              <ArrowLeft className="size-4" aria-hidden /> {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
