import type { Metadata } from "next";
import { Suspense } from "react";
import { Composer } from "@/components/composer";
import { LedgerFilters } from "@/components/ledger-filters";
import { LedgerList } from "@/components/ledger-list";
import { BuildCta, MostWanted, SidebarFootnote, SupportNote, WeekStats } from "@/components/sidebar";
import { LedgerNote, Skeleton } from "@/components/ui";
import { parseSort, parseStatus } from "@/lib/config";
import { getLedgerPage, getLiveMetoos, getStats, withLiveCounts } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "All wishes",
  description: "Every app people wish existed, with how many want each one and who's building it.",
  path: "/wishes",
});

export default function LedgerPage({ searchParams }: PageProps<"/wishes">) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:py-8">
      <h1 className="sr-only">Wishcode: post an app you wish existed</h1>
      <Composer />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-8" aria-label="Wishes">
          <Suspense fallback={<FeedSkeleton />}>
            <Feed searchParams={searchParams} />
          </Suspense>
          <LedgerNote className="mt-4" />
        </section>
        <aside className="flex flex-col gap-6 lg:col-span-4">
          <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
            <Sidebar />
          </Suspense>
          <BuildCta />
          <SupportNote />
          <SidebarFootnote />
        </aside>
      </div>
    </main>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/wishes">, "searchParams">) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const sort = parseSort(params.sort);
  const [page, stats] = await Promise.all([getLedgerPage(status, sort, null), getStats().catch(() => null)]);
  const live = await getLiveMetoos(page.items.map((w) => w.id));

  return (
    <>
      <LedgerFilters status={status} sort={sort} counts={stats?.counts} />
      <LedgerList
        key={`${status}:${sort}`}
        status={status}
        sort={sort}
        initialItems={withLiveCounts(page.items, live)}
        initialCursor={page.nextCursor}
        initialMetoos={live.mine}
      />
    </>
  );
}

async function Sidebar() {
  const stats = await getStats().catch(() => null);
  if (!stats) return null;
  return (
    <>
      <WeekStats week={stats.week} />
      <MostWanted items={stats.most_wanted} />
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading wishes">
      <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card space-y-4 p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-11/12" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}
