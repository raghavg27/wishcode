import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui";

type Action = { href: string; label: string };

type Copy = {
  /** Mono reference line on the empty ledger entry, e.g. "#WISH-????". */
  reference: string;
  title: string;
  body: string;
  primary: Action;
  secondary?: Action;
};

export type NotFoundKind = "page" | "wish" | "developer";

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
};

// Shared 404 layout: an empty ledger entry where the page would have been,
// then a way back into the ledger.
export function NotFoundView({ kind }: { kind: NotFoundKind }) {
  const { reference, title, body, primary, secondary } = COPY[kind];
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl border-[1.5px] border-dashed border-outline/40 bg-surface-low px-6 py-5" aria-hidden>
          <div className="flex items-center justify-between font-mono text-label-sm text-outline">
            <span>{reference}</span>
            <span>404</span>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="h-3 w-11/12 rounded-full bg-surface-container" />
            <div className="h-3 w-2/3 rounded-full bg-surface-container" />
          </div>
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
