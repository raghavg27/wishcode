import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuildCta } from "@/components/sidebar";
import { Avatar, Skeleton } from "@/components/ui";
import { getDirectory } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { developerPath } from "@/lib/site";

export const metadata: Metadata = {
  title: "Builders",
  description: "Developers building and shipping apps for wishes on Wishcode.",
};

export default function DevelopersPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:py-12">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">Builders</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-6 text-ink-muted">
        Developers who connected GitHub to claim wishes and post live links, ordered by links shipped.
      </p>
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <Directory />
          </Suspense>
        </div>
        <aside className="lg:col-span-4">
          <BuildCta />
        </aside>
      </div>
    </main>
  );
}

async function Directory() {
  const devs = await getDirectory();
  if (devs.length === 0) {
    return <p className="card px-6 py-12 text-center text-[15px] text-ink-muted">No builders yet. Be the first to connect GitHub.</p>;
  }
  return (
    <ul className="card divide-y divide-hairline">
      {devs.map((d) => (
        <li key={d.id}>
          <Link href={developerPath(d.handle)} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-low">
            <Avatar dev={d} size={40} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">@{d.handle}</span>
            <span className="text-label text-ink-muted tabular">
              <strong className="text-ink">{formatNumber(d.links)}</strong> links · <strong className="text-ink">{formatNumber(d.building)}</strong> building
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
