import clsx from "clsx";
import Link from "next/link";
import type { Sort, StatusFilter } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { feedPath } from "@/lib/site";
import type { LedgerStats } from "@/lib/types";

const TABS: { value: StatusFilter; label: string; badge: string }[] = [
  { value: "all", label: "All", badge: "bg-surface-container text-outline" },
  { value: "open", label: "Open", badge: "bg-surface-container text-outline" },
  { value: "being_built", label: "Being built", badge: "bg-craft-chip text-[#2f1500]" },
  { value: "fulfilled", label: "Fulfilled", badge: "bg-leaf-chip text-leaf-ink" },
];

export function LedgerFilters({ status, sort, counts }: { status: StatusFilter; sort: Sort; counts?: LedgerStats["counts"] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2">
      <nav aria-label="Filter wishes" className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface-low p-1 shadow-inner">
        {TABS.map((t) => {
          const active = t.value === status;
          return (
            <Link
              key={t.value}
              href={feedPath(t.value, sort)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label sm:px-3.5 font-medium whitespace-nowrap transition-all",
                active ? "bg-surface-lowest text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
              {counts && t.value !== "all" && (
                <span className={clsx("rounded-full px-1.5 text-caption tabular", t.badge)}>{formatNumber(counts[t.value])}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Sort wishes" className="flex items-center rounded-lg bg-surface-low p-0.5 text-label-sm font-medium shadow-inner">
        {(["newest", "top"] as const).map((s) => (
          <Link
            key={s}
            href={feedPath(status, s)}
            scroll={false}
            aria-current={s === sort ? "page" : undefined}
            className={clsx(
              "rounded-md px-2.5 py-1",
              s === sort ? "bg-surface-lowest text-ink shadow-xs" : "text-ink-muted hover:text-ink",
            )}
          >
            {s === "newest" ? "Newest" : "Most me-toos"}
          </Link>
        ))}
      </nav>
    </div>
  );
}
