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

const metadata: Metadata = pageMetadata({
  title: "App ideas people want",
  description: "Browse app ideas posted by real people, sorted by how many want them. Open, being built, or already built.",
  path: "/wishes",
});

// Later pages (?cursor=) are for following links to older wishes, not for search results.
// Google treats noindex plus a canonical as conflicting, so those pages drop the canonical.
export async function generateMetadata({ searchParams }: PageProps<"/wishes">): Promise<Metadata> {
  const { cursor } = await searchParams;
  return cursor ? { ...metadata, alternates: { canonical: null }, robots: { index: false, follow: true } } : metadata;
}

export default function LedgerPage({ searchParams }: PageProps<"/wishes">) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:py-8">
      <h1 className="sr-only">App ideas people wish existed</h1>
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
  const cursor = typeof params.cursor === "string" ? params.cursor : null;
  const [page, stats] = await Promise.all([getLedgerPage(status, sort, cursor), getStats().catch(() => null)]);
  const live = await getLiveMetoos(page.items.map((w) => w.id));

  return (
    <>
      <LedgerFilters status={status} sort={sort} counts={stats?.counts} />
      {/* The ids are in the key so a refresh that brings new wishes replaces the list. */}
      <LedgerList
        key={`${status}:${sort}:${cursor}:${page.items.map((w) => w.id).join(",")}`}
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
