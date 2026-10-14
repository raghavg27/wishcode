import { ArrowLeft, ArrowUpRight, CircleCheck, Gavel, History, ShieldCheck, Sparkles, SquareTerminal, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeveloperPanel, RemoveOwnLink } from "@/components/developer-panel";
import { EmailOptIn, WisherOptInCard } from "@/components/email-opt-in";
import { GithubIcon } from "@/components/icons";
import { FlaggedLink, LinkVerdictPanel } from "@/components/link-verdict";
import { MetooButton } from "@/components/metoo";
import { PostLinkModal, PostLinkTrigger } from "@/components/post-link";
import { CopyLinkButton, ShareIconButton, ShareTargets } from "@/components/share";
import { TimeAgo } from "@/components/time-ago";
import { DevChip, Disclaimer, Skeleton, StatusChip, buttonStyles, statusLabel } from "@/components/ui";
import { EXTERNAL_REL } from "@/components/wish-card";
import { getViewer } from "@/lib/auth";
import { LINKS_DISCLAIMER } from "@/lib/config";
import { getLiveMetoos, getViewerWishState, getWish, withLiveCounts } from "@/lib/data";
import { domainOf, durationBetween, formatDate, formatNumber, pluralize, repoLabel } from "@/lib/format";
import { parseWishId, siteUrl, wishLabel, wishPath } from "@/lib/site";
import type { ViewerWishState, WishDetail, WishLink } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/w/[id]">): Promise<Metadata> {
  const id = parseWishId((await params).id);
  const wish = id ? await getWish(id).catch(() => null) : null;
  if (!wish || wish.removed || !wish.text) return { title: "Wish not found", robots: { index: false } };

  const title = wish.text.length > 70 ? `${wish.text.slice(0, 67)}…` : wish.text;
  const description =
    wish.status === "fulfilled" && wish.first_link
      ? `Fulfilled by @${wish.first_link.developer.handle}. ${pluralize(wish.metoo_count, "me-too")} on Wishcode.`
      : `${pluralize(wish.metoo_count, "me-too")} on Wishcode. ${statusLabel(wish.status, wish.verified)}.`;
  const image = `/api/og/wish/${wish.id}?v=${wish.status}-${wish.verified ? 1 : 0}-${wish.link_count}-${wish.metoo_count}`;
  return {
    title,
    description,
    alternates: { canonical: wishPath(wish.id) },
    openGraph: { title: `“${wish.text}”`, description, url: wishPath(wish.id), images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `“${wish.text}”`, description, images: [image] },
  };
}

export default function WishPage({ params, searchParams }: PageProps<"/w/[id]">) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:pt-8 sm:pb-12">
      <Suspense fallback={<WishSkeleton />}>
        <WishView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Unknown ids get their 404 status from src/proxy.ts; by the time this runs
// the response is already streaming.
async function WishView({ params, searchParams }: PageProps<"/w/[id]">) {
  const id = parseWishId((await params).id);
  if (!id) notFound();
  const cached = await getWish(id);
  if (!cached) notFound();

  const [{ developer }, live, viewer, sp] = await Promise.all([
    getViewer().catch(() => ({ developer: null })),
    getLiveMetoos([id]),
    getViewerWishState(id),
    searchParams,
  ]);
  const [wish] = withLiveCounts([cached], live);
  const metooActive = live.mine.includes(id);
  const metoo = { active: metooActive, count: wish.metoo_count };
  const askWisher = sp.posted === "1" && !wish.removed && viewer.is_wisher && !viewer.subscribed;
  const viewerLink = developer ? wish.links.find((l) => l.developer.id === developer.id) : undefined;
  const claimed = Boolean(developer && wish.claims.some((c) => c.developer.id === developer.id));
  const path = wishPath(wish.id);
  const text = wish.text ?? "";
  const shareText = `I wish there was an app: “${text}”`;

  return (
    <>
      {sp.posted === "1" && !wish.removed && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber/40 bg-craft-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-label font-medium text-ink">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Your wish is live. Share it so others can me-too it.
          </p>
          <CopyLinkButton path={path} />
        </div>
      )}
      {askWisher && <WisherOptInCard wishId={wish.id} subscribed={viewer.subscribed} />}
      {claimed && !wish.removed && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-leaf-soft px-4 py-3 text-label font-medium text-ink">
          <CircleCheck className="size-4 text-leaf" aria-hidden />
          You&apos;re listed as building this wish
          <span className="rounded bg-leaf-chip/60 px-1.5 py-0.5 text-caption font-semibold tracking-wider text-leaf-ink uppercase">
            Active claim
          </span>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-label font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> All wishes
        </Link>
        <span className="font-mono text-label-sm text-outline">{wishLabel(wish.id)}</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-10 lg:col-span-8">
          {wish.removed ? (
            <RemovedHero wish={wish} />
          ) : (
            <WishHero wish={wish} metooActive={metooActive} viewer={viewer} showOptIn={!askWisher} />
          )}

          {!wish.removed && (
            <section id="links" aria-labelledby="links-title" className="scroll-mt-24">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="links-title" className="flex items-center gap-2 font-serif text-[22px] leading-8 text-ink">
                  Live links
                  <span className="rounded-full bg-surface-container px-2 text-label font-medium text-ink-muted tabular">
                    {wish.links.length}
                  </span>
                </h2>
                <span className="text-label-sm text-ink-muted">What people built</span>
              </div>
              <Disclaimer className="mb-4">{LINKS_DISCLAIMER}</Disclaimer>

              {wish.links.length === 0 ? (
                <div className="card flex flex-col items-center px-6 py-12 text-center">
                  <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-low">
                    <SquareTerminal className="size-6 text-ink" aria-hidden />
                  </span>
                  <h3 className="font-serif text-[22px] leading-8 font-medium text-ink">No live link yet</h3>
                  <p className="mt-1 max-w-sm text-[14px] leading-[22px] text-ink-muted">
                    The first developer to post a working link fulfils this wish for everyone who wished it.
                  </p>
                  <PostLinkTrigger signedIn={Boolean(developer)} className={`${buttonStyles.amber} mt-6 rounded-full px-6`}>
                    Post a live link <ArrowUpRight className="size-4" aria-hidden />
                  </PostLinkTrigger>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {wish.links.map((link) => {
                    const card = (
                      <LinkCard
                        link={link}
                        wishId={wish.id}
                        firstToShip={link.id === wish.first_link?.id}
                        viewer={viewer}
                        metoo={metoo}
                        ownLink={viewerLink?.id === link.id}
                      />
                    );
                    return (
                      <li key={link.id}>
                        {link.verdict === "flagged" ? <FlaggedLink handle={link.developer.handle}>{card}</FlaggedLink> : card}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {!wish.removed && (
            <section aria-labelledby="share-title" className="card p-6 sm:p-7">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 id="share-title" className="text-label font-semibold tracking-wider text-ink uppercase">
                    Share this wish
                  </h2>
                  <p className="text-label-sm text-ink-muted">Every me-too tells developers this is worth building.</p>
                </div>
                <ShareTargets path={path} text={shareText} />
              </div>
              <ShareCardPreview wish={wish} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:col-span-4">
          <DeveloperPanel
            wishId={wish.id}
            status={wish.status}
            removed={wish.removed}
            claims={wish.claims}
            developer={developer}
            viewerLinkId={viewerLink?.id ?? null}
          />
          <WishRecord wish={wish} />
        </aside>
      </div>

      {!wish.removed && (
        <>
          <PostLinkModal
            wishId={wish.id}
            wishText={text}
            developer={developer}
            hasLinks={wish.links.length > 0}
            alreadyPosted={Boolean(viewerLink)}
          />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
            <div className="flex items-center gap-3">
              <MetooButton wishId={wish.id} active={metooActive} count={wish.metoo_count} variant="bar" />
              <ShareIconButton path={path} text={shareText} className="h-11 w-auto rounded-xl bg-surface-container px-4 text-ink" />
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-caption text-ink-muted">
              <ShieldCheck className="size-3" aria-hidden /> Wishers and me-toos are 100% anonymous
            </p>
          </div>
        </>
      )}
    </>
  );
}

function LinkCard({
  link,
  wishId,
  firstToShip,
  viewer,
  metoo,
  ownLink,
}: {
  link: WishLink;
  wishId: number;
  firstToShip: boolean;
  viewer: ViewerWishState;
  metoo: { active: boolean; count: number };
  ownLink: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DevChip dev={link.developer} />
            <TimeAgo iso={link.created_at} prefix="posted" className="text-label-sm text-ink-muted" />
          </div>
          {firstToShip && (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-chip/50 px-2.5 py-0.5 text-label-sm font-medium text-leaf-ink">
              <Sprout className="size-3.5" aria-hidden /> First to ship
            </span>
          )}
        </div>
        <p className="mt-3 text-[15px] leading-6 text-ink">{link.description}</p>
      </div>
      <LinkVerdictPanel
        wishId={wishId}
        linkId={link.id}
        isWisher={viewer.is_wisher}
        metoo={metoo}
        verdict={link.verdict}
        worksCount={link.works_count}
        brokenCount={link.broken_count}
        wisherVerdict={link.wisher_verdict}
        mine={viewer.verdicts[String(link.id)] ?? null}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-low px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href={link.url}
            target="_blank"
            rel={EXTERNAL_REL}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink px-4 py-2 text-label font-semibold text-white transition-colors hover:bg-inverse"
          >
            Open app <ArrowUpRight className="size-4" aria-hidden />
          </a>
          <span className="truncate font-mono text-label-sm text-ink-muted">{domainOf(link.url)}</span>
        </div>
        <div className="flex items-center gap-4">
          {link.repo_url && (
            <a
              href={link.repo_url}
              target="_blank"
              rel={EXTERNAL_REL}
              title={repoLabel(link.repo_url)}
              className="inline-flex items-center gap-1.5 text-label font-medium text-ink hover:underline"
            >
              <GithubIcon className="size-4" /> Source <ArrowUpRight className="size-3" aria-hidden />
            </a>
          )}
          {ownLink && <RemoveOwnLink linkId={link.id} compact />}
        </div>
      </div>
    </div>
  );
}

function WishHero({
  wish,
  metooActive,
  viewer,
  showOptIn,
}: {
  wish: WishDetail;
  metooActive: boolean;
  viewer: ViewerWishState;
  showOptIn: boolean;
}) {
  return (
    <article className="card relative overflow-hidden p-6 sm:p-8">
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-leaf-border via-amber/50 to-leaf-border"
        aria-hidden
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 text-label-sm text-ink-muted">
          <History className="size-3.5" aria-hidden />
          <TimeAgo iso={wish.created_at} prefix="Posted" /> by anonymous wisher
          <span className="font-mono text-outline">{wishLabel(wish.id)}</span>
        </p>
        <StatusChip status={wish.status} verified={wish.verified} className="uppercase tracking-wider" />
      </div>
      <h1 className="mt-5 font-serif text-[26px] leading-9 font-medium tracking-[-0.01em] text-ink sm:text-[32px] sm:leading-[42px]">
        “{wish.text}”
      </h1>
      <div className="mt-8 hidden flex-wrap items-center gap-4 sm:flex">
        <MetooButton wishId={wish.id} active={metooActive} count={wish.metoo_count} variant="hero" />
      </div>
      <p className="mt-3 hidden items-center gap-1.5 text-label-sm text-ink-muted sm:flex">
        <ShieldCheck className="size-3.5" aria-hidden />
        Wishers are 100% anonymous. Tap to add your me-too to this wish.
      </p>
      {showOptIn && (
        <EmailOptIn
          wishId={wish.id}
          isWisher={viewer.is_wisher}
          subscribed={viewer.subscribed}
          metoo={{ active: metooActive, count: wish.metoo_count }}
          className="mt-4"
        />
      )}
      <p className="mt-6 text-label text-ink-muted sm:hidden">
        <span className="font-semibold text-ink tabular">{pluralize(wish.metoo_count, "me-too")}</span>
        {wish.live_link_count > 0 && ` · ${pluralize(wish.live_link_count, "ship")}`}
        {wish.claim_count > 0 && ` · ${pluralize(wish.claim_count, "builder")}`}
      </p>
    </article>
  );
}

function RemovedHero({ wish }: { wish: WishDetail }) {
  return (
    <article className="card p-6 sm:p-8">
      <div className="flex items-start gap-3 rounded-xl border-l-4 border-outline bg-surface-high p-4">
        <Gavel className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
        <div>
          <p className="text-label font-semibold text-ink">This wish was removed.</p>
          <p className="text-label text-ink-muted">Its text is hidden and you can&apos;t me-too it anymore.</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 text-label-sm text-ink-muted">
        <StatusChip status={wish.status} verified={wish.verified} removed />
        <TimeAgo iso={wish.created_at} prefix="Posted" />
        <span className="font-mono">{wishLabel(wish.id)}</span>
      </div>
      <div className="mt-6 border-t border-hairline pt-5">
        <MetooButton wishId={wish.id} active={false} count={wish.metoo_count} disabled />
      </div>
    </article>
  );
}

function WishRecord({ wish }: { wish: WishDetail }) {
  const rows: [string, React.ReactNode][] = [
    ["First posted", formatDate(wish.created_at)],
    ["Me-toos", formatNumber(wish.metoo_count)],
    ["Live links", formatNumber(wish.live_link_count)],
    ["Builders", formatNumber(wish.claim_count)],
  ];
  if (wish.fulfilled_at) rows.splice(1, 0, ["Built in", <span key="t" className="text-leaf-strong">{durationBetween(wish.created_at, wish.fulfilled_at)}</span>]);
  return (
    <section className="card p-6" aria-labelledby="record-title">
      <h2 id="record-title" className="mb-4 text-label font-semibold tracking-wider text-ink uppercase">
        About this wish
      </h2>
      <dl className="space-y-3 text-label">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-medium text-ink tabular">{v}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Status</dt>
          <dd>{wish.removed ? <StatusChip status={wish.status} verified={wish.verified} removed /> : <StatusChip status={wish.status} verified={wish.verified} />}</dd>
        </div>
      </dl>
    </section>
  );
}

function ShareCardPreview({ wish }: { wish: WishDetail }) {
  const host = new URL(siteUrl()).host;
  return (
    <figure className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface-low" aria-label="Share card preview">
      <div className="relative p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-ink uppercase">
            <span className="flex size-5 items-center justify-center rounded bg-amber text-caption font-bold">W</span>
            Wishcode
          </span>
          <StatusChip status={wish.status} verified={wish.verified} />
        </div>
        <p className="mt-6 line-clamp-3 font-serif text-[22px] leading-8 text-ink sm:text-[26px] sm:leading-9">“{wish.text}”</p>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-surface-lowest/70 px-6 py-3 text-label-sm text-ink-muted sm:px-8">
        <span className="flex flex-wrap items-center gap-x-3">
          <span className="tabular">{pluralize(wish.metoo_count, "me-too")}</span>
          {wish.first_link && (
            <>
              <span aria-hidden>•</span>
              <span>
                Fulfilled by <strong className="text-ink">@{wish.first_link.developer.handle}</strong>
              </span>
              <span aria-hidden>•</span>
              <span className="font-mono text-primary">{domainOf(wish.first_link.url)}</span>
            </>
          )}
        </span>
        <span className="font-mono">
          {host}
          {wishPath(wish.id)}
        </span>
      </figcaption>
    </figure>
  );
}

function WishSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading wish">
      <Skeleton className="mb-6 h-5 w-32" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="card space-y-5 p-8 lg:col-span-8">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-12 w-64 rounded-full" />
        </div>
        <div className="card space-y-3 p-6 lg:col-span-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
