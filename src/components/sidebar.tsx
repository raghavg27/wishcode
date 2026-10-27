import { ArrowRight, Coffee, Flame, Hand, History, SquareTerminal, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { GithubIcon } from "@/components/icons";
import { getViewer } from "@/lib/auth";
import { formatNumber, weekDeltaText } from "@/lib/format";
import { SUPPORT_URL, wishPath } from "@/lib/site";
import type { LedgerStats } from "@/lib/types";

export function WeekStats({ week }: { week: LedgerStats["week"] }) {
  const delta = weekDeltaText(week.wishes, week.wishes_prev);
  const up = Boolean(delta?.includes(" more "));
  return (
    <section className="card p-5" aria-labelledby="week-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="week-title" className="text-label-sm font-semibold tracking-wider text-ink uppercase">
          This week on Wishcode
        </h2>
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf-strong opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-leaf-strong" />
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-surface-low py-2 text-center">
        <div className="p-2">
          <dd className="font-serif text-headline font-semibold text-ink tabular">{formatNumber(week.wishes)}</dd>
          <dt className="mt-0.5 text-caption text-ink-muted">Wishes posted</dt>
        </div>
        <div className="p-2">
          <dd className="font-serif text-headline font-semibold text-primary tabular">{formatNumber(week.metoos)}</dd>
          <dt className="mt-0.5 text-caption text-ink-muted">Me-toos given</dt>
        </div>
        <div className="p-2">
          <dd className="font-serif text-headline font-semibold text-leaf-strong tabular">{formatNumber(week.fulfilled)}</dd>
          <dt className="mt-0.5 text-caption text-ink-muted">Fulfilled</dt>
        </div>
      </dl>
      {delta && (
        <p
          className={
            up
              ? "mt-4 flex items-center gap-1 pt-1 text-caption font-medium text-leaf-strong"
              : "mt-4 pt-1 text-caption font-medium text-ink-muted"
          }
        >
          {up && <TrendingUp className="size-3.5" aria-hidden />}
          {delta}
        </p>
      )}
    </section>
  );
}

export function MostWanted({ items }: { items: LedgerStats["most_wanted"] }) {
  if (items.length === 0) return null;
  return (
    <section className="card p-5" aria-labelledby="wanted-title">
      <div className="mb-1 flex items-center gap-2">
        <Flame className="size-[18px] fill-amber text-primary" aria-hidden />
        <h2 id="wanted-title" className="font-serif text-headline font-semibold text-ink">
          Most wanted, still open
        </h2>
      </div>
      <p className="mb-4 text-caption text-ink-muted">Lots of people want these. Nobody has built them yet.</p>
      <ul className="space-y-1">
        {items.map((w) => (
          <li key={w.id}>
            <Link
              href={wishPath(w.id)}
              className="group -mx-2 flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-surface-low"
            >
              <span className="line-clamp-2 text-[14px] leading-tight text-ink group-hover:text-primary">{w.text}</span>
              <span className="mt-0.5 flex shrink-0 items-center gap-1 text-label font-semibold text-primary tabular">
                <Hand className="size-3.5" aria-hidden /> {formatNumber(w.metoo_count)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Want to build one?": GitHub connect, or a way to a wish once connected. */
export function BuildCta() {
  return (
    <Suspense fallback={<BuildCtaView signedIn={false} />}>
      <ViewerBuildCta />
    </Suspense>
  );
}

async function ViewerBuildCta() {
  const { developer } = await getViewer().catch(() => ({ developer: null }));
  return <BuildCtaView signedIn={Boolean(developer)} />;
}

function BuildCtaView({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="rounded-xl bg-surface-high p-5 shadow-card">
      <span className="mb-3 inline-flex rounded-lg bg-surface-lowest p-2 shadow-xs">
        <SquareTerminal className="size-5 text-primary" aria-hidden />
      </span>
      <h2 className="mb-1 font-serif text-headline font-semibold text-ink">Want to build one?</h2>
      <p className="mb-5 text-[14px] leading-[22px] text-ink-muted">
        {signedIn
          ? "The most wanted open wishes are a good place to start. Claim one or share what you built."
          : "Connect GitHub to claim a wish or share what you built. No deadlines, nobody to ask permission."}
      </p>
      <Link
        href={signedIn ? "/wishes?status=open&sort=top" : "/login"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-inverse px-4 py-2.5 text-label font-medium text-inverse-ink shadow-sm transition-colors hover:bg-ink"
      >
        {signedIn ? (
          <>
            Find a wish to build <ArrowRight className="size-4" aria-hidden />
          </>
        ) : (
          <>
            <GithubIcon className="size-4" />
            Connect GitHub
          </>
        )}
      </Link>
    </section>
  );
}

/** A quiet ask to help cover hosting. */
export function SupportNote() {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-xl bg-amber-soft/60 p-4 transition-colors hover:bg-amber-soft"
    >
      <Coffee className="mt-0.5 size-5 shrink-0 text-[#643f00]" aria-hidden />
      <span>
        <span className="block text-label font-semibold text-ink">Support this project</span>
        <span className="mt-0.5 block text-caption text-ink-muted">
          Wishcode is free, and I keep it running myself. A coffee helps keep it that way.
        </span>
      </span>
    </a>
  );
}

export function SidebarFootnote() {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-caption text-outline">
      <span className="flex items-center gap-1">
        <History className="size-3.5" aria-hidden /> Every wish is public
      </span>
      <Link href="/principles" className="underline hover:text-ink">
        Principles
      </Link>
    </div>
  );
}
