import { Flame, Hand, History, SquareTerminal, TrendingUp } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/icons";
import { formatNumber } from "@/lib/format";
import { wishPath } from "@/lib/site";
import type { LedgerStats } from "@/lib/types";

export function WeekStats({ week }: { week: LedgerStats["week"] }) {
  const delta = week.wishes_prev > 0 ? Math.round(((week.wishes - week.wishes_prev) / week.wishes_prev) * 100) : null;
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
      {delta !== null && (
        <div className="mt-4 flex items-center justify-between pt-1 text-caption text-outline">
          <span>Weekly velocity</span>
          <span className={delta >= 0 ? "flex items-center gap-0.5 font-medium text-leaf-strong" : "font-medium text-ink-muted"}>
            {delta >= 0 && <TrendingUp className="size-3.5" aria-hidden />}
            {delta >= 0 ? "+" : ""}
            {delta}% vs last week
          </span>
        </div>
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
      <p className="mb-4 text-caption text-ink-muted">Developer shortlist · High intent</p>
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

export function BuildCta() {
  return (
    <section className="rounded-xl bg-surface-high p-5 shadow-card">
      <span className="mb-3 inline-flex rounded-lg bg-surface-lowest p-2 shadow-xs">
        <SquareTerminal className="size-5 text-primary" aria-hidden />
      </span>
      <h2 className="mb-1 font-serif text-headline font-semibold text-ink">Want to build one?</h2>
      <p className="mb-5 text-[14px] leading-[22px] text-ink-muted">
        Connect GitHub to claim a wish or post a live link. No deadlines, no approval rituals.
      </p>
      <Link
        href="/login"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-inverse px-4 py-2.5 text-label font-medium text-inverse-ink shadow-sm transition-colors hover:bg-ink"
      >
        <GithubIcon className="size-4" />
        Connect GitHub
      </Link>
    </section>
  );
}

export function SidebarFootnote() {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-caption text-outline">
      <span className="flex items-center gap-1">
        <History className="size-3.5" aria-hidden /> Public ledger
      </span>
      <Link href="/principles" className="underline hover:text-ink">
        Principles
      </Link>
    </div>
  );
}
