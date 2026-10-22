import { ArrowUpRight, Flag, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModerationActions } from "@/components/report";
import { TimeAgo } from "@/components/time-ago";
import { DevChip, Skeleton } from "@/components/ui";
import { EXTERNAL_REL } from "@/components/wish-card";
import { getViewer } from "@/lib/auth";
import { getReportQueue } from "@/lib/data";
import { pluralize } from "@/lib/format";
import { REPORT_REASONS, isReportReason } from "@/lib/reports";
import { wishLabel, wishPath } from "@/lib/site";
import type { ReportQueueItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false },
};

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-[860px] px-4 py-10 sm:py-14">
      <h1 className="font-serif text-display-sm text-ink">Reports</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">
        Open reports, most reported first. Removing a wish hides its text everywhere; removing a link takes it off the
        wish. Dismissing keeps it up.
      </p>
      <Suspense fallback={<QueueSkeleton />}>
        <Queue />
      </Suspense>
    </main>
  );
}

// Anyone who isn't an admin gets the not-found page.
async function Queue() {
  const { developer } = await getViewer().catch(() => ({ developer: null }));
  if (!developer?.is_admin) notFound();
  const items = await getReportQueue(developer.id);

  if (items.length === 0) {
    return (
      <div className="card mt-8 flex flex-col items-center px-6 py-14 text-center">
        <Inbox className="size-8 text-ink-muted" aria-hidden />
        <p className="mt-3 font-serif text-[22px] leading-8 text-ink">Nothing to review.</p>
        <p className="mt-1 text-label text-ink-muted">New reports show up here.</p>
      </div>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {items.map((item) => (
        <li key={`${item.wish_id}:${item.link?.id ?? "wish"}`}>
          <QueueItem item={item} />
        </li>
      ))}
    </ul>
  );
}

function QueueItem({ item }: { item: ReportQueueItem }) {
  const reasons = Object.entries(item.reasons).sort((a, b) => b[1] - a[1]);
  return (
    <article className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-ink uppercase">
          <Flag className="size-3.5 text-danger" aria-hidden />
          {item.link ? "Link" : "Wish"} · {pluralize(item.report_count, "report")}
        </p>
        <TimeAgo iso={item.last_reported_at} prefix="last reported" className="text-label-sm text-ink-muted" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {reasons.map(([reason, n]) => (
          <span key={reason} className="rounded-full bg-danger-soft px-2.5 py-0.5 text-label-sm text-[#93000a]">
            {isReportReason(reason) ? REPORT_REASONS[reason] : reason} · {n}
          </span>
        ))}
      </div>

      <Link href={wishPath(item.wish_id)} className="mt-4 block rounded-lg bg-surface-low p-4 hover:bg-surface-container">
        <span className="font-mono text-label-sm text-outline">{wishLabel(item.wish_id)}</span>
        <span className="mt-1 block font-serif text-[18px] leading-7 text-ink">“{item.wish_text}”</span>
      </Link>

      {item.link && (
        <div className="mt-3 rounded-lg border border-hairline p-4">
          <div className="flex flex-wrap items-center gap-2">
            <DevChip dev={item.link.developer} />
          </div>
          <p className="mt-2 text-[15px] leading-6 text-ink">{item.link.description}</p>
          <a
            href={item.link.url}
            target="_blank"
            rel={EXTERNAL_REL}
            className="mt-2 inline-flex max-w-full items-center gap-1 font-mono text-label-sm break-all text-primary hover:underline"
          >
            {item.link.url} <ArrowUpRight className="size-3 shrink-0" aria-hidden />
          </a>
          {item.link.repo_url && (
            <p className="mt-1 font-mono text-label-sm break-all text-ink-muted">Source: {item.link.repo_url}</p>
          )}
        </div>
      )}

      <ModerationActions wishId={item.wish_id} linkId={item.link?.id ?? null} dismissible className="mt-5" />
    </article>
  );
}

function QueueSkeleton() {
  return (
    <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading reports">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
