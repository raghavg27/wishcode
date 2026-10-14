import { ArrowUpRight, CalendarDays, Clock, Code, ExternalLink, Hammer, Hand, Info, Link2, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RemoveOwnLink } from "@/components/developer-panel";
import { ProfileLinkFilter } from "@/components/profile-filter";
import { TimeAgo } from "@/components/time-ago";
import { StickyNote } from "@/components/doodles";
import { Avatar, EmptyState, Skeleton, StatusChip } from "@/components/ui";
import { EXTERNAL_REL } from "@/components/wish-card";
import { getViewer } from "@/lib/auth";
import { getDeveloperProfile } from "@/lib/data";
import { domainOf, formatDate, formatNumber, repoLabel } from "@/lib/format";
import { GITHUB_HANDLE, developerPath, wishPath } from "@/lib/site";
import type { DeveloperProfile } from "@/lib/types";

async function load(params: PageProps<"/d/[handle]">["params"]) {
  const handle = decodeURIComponent((await params).handle);
  if (!GITHUB_HANDLE.test(handle)) return null;
  return getDeveloperProfile(handle);
}

export async function generateMetadata({ params }: PageProps<"/d/[handle]">): Promise<Metadata> {
  const profile = await load(params).catch(() => null);
  if (!profile) return { title: "Developer not found", robots: { index: false } };
  return {
    title: `@${profile.handle}`,
    description: `@${profile.handle} on Wishcode: ${profile.stats.links} live links posted, ${profile.stats.building} wishes being built.`,
    alternates: { canonical: developerPath(profile.handle) },
  };
}

export default function DeveloperPage({ params, searchParams }: PageProps<"/d/[handle]">) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:py-10">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Unknown handles get their 404 status from src/proxy.ts.
async function Profile({ params, searchParams }: PageProps<"/d/[handle]">) {
  const profile = await load(params);
  if (!profile) notFound();
  const [{ developer }, sp] = await Promise.all([getViewer().catch(() => ({ developer: null })), searchParams]);
  const isSelf = developer?.id === profile.id;
  const filter = sp.filter === "first" ? "first" : sp.filter === "top" ? "top" : "all";

  let links = profile.links;
  if (filter === "first") links = links.filter((l) => l.first_to_ship);
  if (filter === "top") links = [...links].sort((a, b) => b.wish.metoo_count - a.wish.metoo_count);

  return (
    <>
      <ProfileHeader profile={profile} />
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8" aria-labelledby="links-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="links-title" className="font-serif text-[22px] leading-8 text-ink">
              Linked apps &amp; shipped wishes <span className="text-label text-ink-muted tabular">({profile.stats.links})</span>
            </h2>
            <ProfileLinkFilter handle={profile.handle} filter={filter} total={profile.stats.links} first={profile.stats.first_to_ship} />
          </div>
          {links.length === 0 ? (
            <EmptyState
              doodle={StickyNote}
              title={filter === "first" ? "Not first to ship on anything yet. Give it time." : "Nothing shipped yet. Give it time."}
              action={isSelf ? { href: "/?status=open&sort=top", label: "Find a wish to build" } : undefined}
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {links.map((l) => (
                <li key={l.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={l.wish.status} verified={l.wish.verified} />
                      {l.first_to_ship && (
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-leaf-soft px-2.5 text-label-sm font-medium text-leaf-ink">
                          <Sprout className="size-3.5" aria-hidden /> First to ship
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-0.5 text-label-sm text-ink-muted tabular">
                      <Hand className="size-3.5" aria-hidden /> {formatNumber(l.wish.metoo_count)} me-toos
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-wish-sm text-ink sm:text-wish">
                    <Link href={wishPath(l.wish.id)} className="hover:underline">
                      “{l.wish.text}”
                    </Link>
                  </h3>
                  <p className="mt-2 text-[15px] leading-6 text-ink-muted">{l.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={l.url}
                      target="_blank"
                      rel={EXTERNAL_REL}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-label font-medium text-ink hover:bg-surface-container"
                    >
                      <ExternalLink className="size-4" aria-hidden /> Open app <span className="text-label-sm text-ink-muted">{domainOf(l.url)}</span>
                    </a>
                    {l.repo_url && (
                      <a
                        href={l.repo_url}
                        target="_blank"
                        rel={EXTERNAL_REL}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-label font-medium text-ink hover:bg-surface-container"
                      >
                        <Code className="size-4" aria-hidden /> Source{" "}
                        <span className="truncate text-label-sm text-ink-muted">{repoLabel(l.repo_url)}</span>
                      </a>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <TimeAgo iso={l.created_at} prefix="Posted" className="flex items-center gap-1.5 text-label-sm text-ink-muted" />
                    {isSelf && <RemoveOwnLink linkId={l.id} compact />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 flex items-start gap-3 rounded-xl bg-surface-low p-4 text-label-sm text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="block font-medium text-ink">Public profile</span>
              I don&apos;t check links before they go up. Developers post them directly.
            </p>
          </div>
        </section>

        <aside className="flex flex-col gap-3 lg:col-span-4" aria-labelledby="building-title">
          <div className="rounded-xl bg-surface-low p-4">
            <h2 id="building-title" className="flex items-center justify-between font-serif text-[20px] leading-7 font-semibold text-ink">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber" aria-hidden /> Currently building
                <span className="text-label text-craft-ink">({profile.claims.length})</span>
              </span>
              <Hammer className="size-5 text-outline" aria-hidden />
            </h2>
            <p className="mt-1 text-label-sm text-ink-muted">No deadlines. A claim stays until they ship it or drop it.</p>
          </div>
          {profile.claims.length === 0 ? (
            <p className="card px-4 py-6 text-center text-label text-ink-muted">Not building anything right now.</p>
          ) : (
            profile.claims.map((c) => (
              <article key={c.wish.id} className="card p-4">
                <div className="flex items-center justify-between text-label-sm text-ink-muted">
                  <span className="flex items-center gap-1 tabular">
                    <Hand className="size-3.5" aria-hidden /> {formatNumber(c.wish.metoo_count)} me-toos
                  </span>
                  <TimeAgo iso={c.created_at} prefix="Claimed" className="flex items-center gap-1" />
                </div>
                <Link href={wishPath(c.wish.id)} className="mt-2 block font-serif text-[18px] leading-[26px] text-ink hover:underline">
                  “{c.wish.text}”
                </Link>
                {isSelf && (
                  <Link
                    href={`${wishPath(c.wish.id)}?intent=link`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-1 text-label font-semibold text-on-amber hover:bg-amber-hover"
                  >
                    <Link2 className="size-4" aria-hidden /> Post link
                  </Link>
                )}
              </article>
            ))
          )}
        </aside>
      </div>
    </>
  );
}

function ProfileHeader({ profile }: { profile: DeveloperProfile }) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-surface-low p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-5">
        <Avatar dev={profile} size={88} className="ring-4 ring-surface-lowest" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-display-sm text-ink sm:text-[44px] sm:leading-[52px]">@{profile.handle}</h1>
            <a
              href={`https://github.com/${profile.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-surface-lowest px-3 py-1 text-label font-medium text-ink shadow-card hover:bg-surface"
            >
              View on GitHub <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-ink-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden /> Joined {formatDate(profile.joined_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden /> {formatNumber(profile.stats.links + profile.stats.building)} public contributions
            </span>
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-hairline rounded-xl bg-surface-lowest py-4 text-center shadow-card">
        <div className="px-5">
          <dd className="font-serif text-[28px] leading-9 font-semibold text-ink tabular">{formatNumber(profile.stats.links)}</dd>
          <dt className="text-label-sm text-ink-muted">Links posted</dt>
        </div>
        <div className="px-5">
          <dd className="font-serif text-[28px] leading-9 font-semibold text-leaf-strong tabular">{formatNumber(profile.stats.first_to_ship)}</dd>
          <dt className="text-label-sm text-ink-muted">First to ship</dt>
        </div>
        <div className="px-5">
          <dd className="font-serif text-[28px] leading-9 font-semibold text-craft-ink tabular">{formatNumber(profile.stats.building)}</dd>
          <dt className="text-label-sm text-ink-muted">Building now</dt>
        </div>
      </dl>
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Skeleton className="h-64 rounded-xl lg:col-span-8" />
        <Skeleton className="h-48 rounded-xl lg:col-span-4" />
      </div>
    </div>
  );
}
