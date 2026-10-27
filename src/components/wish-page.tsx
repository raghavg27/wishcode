import clsx from "clsx";
import { ArrowLeft, ArrowUpRight, CircleCheck, Flag, Gavel, Hand, History, ShieldCheck, SquareTerminal, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeveloperPanel, RemoveOwnLink } from "@/components/developer-panel";
import { EmailOptIn } from "@/components/email-opt-in";
import { GithubIcon, LogoMark } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { FlaggedLink, LinkVerdictPanel } from "@/components/link-verdict";
import { MetooButton } from "@/components/metoo";
import { PostLinkModal, PostLinkTrigger } from "@/components/post-link";
import { PostedMoment } from "@/components/posted-moment";
import { ModerationActions, ReportButton } from "@/components/report";
import { ScrollIntoView } from "@/components/scroll-into-view";
import { DownloadImageButton, ShareIconButton, ShareTargets } from "@/components/share";
import { ShareMomentButton } from "@/components/share-moment";
import { TimeAgo } from "@/components/time-ago";
import { DevChip, Disclaimer, Skeleton, StatusChip, buttonStyles, statusLabel } from "@/components/ui";
import { EXTERNAL_REL } from "@/components/wish-card";
import { getViewer } from "@/lib/auth";
import { LINKS_DISCLAIMER } from "@/lib/config";
import { getLiveMetoos, getRelatedWishes, getViewerWishState, getWish, withLiveCounts } from "@/lib/data";
import { domainOf, durationBetween, formatDate, formatNumber, pluralize, repoLabel } from "@/lib/format";
import {
  cameTruePath,
  cardFilename,
  developerCardSrc,
  developerShare,
  developerSharePath,
  liveLinkBy,
  peopleCount,
  wishCardSrc,
  wisherCardLink,
  wisherShare,
  type ShareMomentProps,
} from "@/lib/share-copy";
import { OPEN_GRAPH_BASE, wishSchema } from "@/lib/seo";
import { parseWishId, siteUrl, wishLabel, wishPath } from "@/lib/site";
import type { ViewerWishState, WishDetail, WishLink } from "@/lib/types";

// The wish page, shared by /w/:id and its share URLs: /w/:id/by/:handle
// (a developer's card) and /w/:id/came-true (the wisher's card). They differ
// only in metadata and which link is highlighted; all three are canonically /w/:id.

export type WishPageTarget = { by: string } | "came-true" | null;

type WishParams = Promise<{ id: string; handle?: string }>;

function decodeSegment(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}

export function targetOf(params: { handle?: string }, cameTrue = false): WishPageTarget {
  if (cameTrue) return "came-true";
  return params.handle === undefined ? null : { by: decodeSegment(params.handle) };
}

function clip(text: string, max = 70) {
  return text.length > max ? `${text.slice(0, max - 3)}…` : text;
}

export async function wishMetadata(params: WishParams, cameTrue = false): Promise<Metadata> {
  const p = await params;
  const target = targetOf(p, cameTrue);
  const id = parseWishId(p.id);
  const wish = id ? await getWish(id).catch(() => null) : null;
  if (!wish || wish.removed || !wish.text) return { title: "Wish not found", robots: { index: false } };

  const people = peopleCount(wish.metoo_count);
  const wanted = people === 1 ? "1 person wants it" : `${formatNumber(people)} people want it`;
  let title = `App idea: ${clip(wish.text, 58)}`;
  let ogTitle = `“${wish.text}”`;
  let description =
    wish.status === "fulfilled" && wish.first_link
      ? `“${clip(wish.text, 110)}” An app idea on Wishcode, built by @${wish.first_link.developer.handle}. ${wanted}.`
      : `“${clip(wish.text, 110)}” An app idea on Wishcode. ${wanted}. ${statusLabel(wish.status, wish.verified)}.`;
  let url = wishPath(wish.id);
  let image = wishCardSrc(wish);

  if (target === "came-true") {
    const link = wisherCardLink(wish.links);
    if (!link) return { title: "Share link not found", robots: { index: false } };
    title = ogTitle = `A wish came true: “${clip(wish.text, 60)}”`;
    description = `Built by @${link.developer.handle} on Wishcode.`;
    url = cameTruePath(wish.id);
    image = wisherShare({ ...wish, text: wish.text }, link).image;
  } else if (target) {
    const link = liveLinkBy(wish.links, target.by);
    if (!link) return { title: "Share link not found", robots: { index: false } };
    title = ogTitle = `@${link.developer.handle} built “${clip(wish.text, 60)}”`;
    description = `${formatNumber(peopleCount(wish.metoo_count))} people wished for this on Wishcode.`;
    url = developerSharePath(wish.id, link.developer.handle);
    image = developerCardSrc(link, wish.metoo_count);
  }

  return {
    title,
    description,
    alternates: { canonical: wishPath(wish.id) },
    // og:url stays on the share URL: some platforms re-read the preview from it.
    openGraph: { ...OPEN_GRAPH_BASE, title: ogTitle, description, url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [image] },
  };
}

export function WishPage({
  params,
  searchParams,
  cameTrue = false,
}: {
  params: WishParams;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  cameTrue?: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:pt-8 sm:pb-12">
      <Suspense fallback={<WishSkeleton />}>
        <WishView params={params} searchParams={searchParams} cameTrue={cameTrue} />
      </Suspense>
    </main>
  );
}

// Unknown ids get their 404 status from src/proxy.ts; by the time this runs
// the response is already streaming.
async function WishView({
  params,
  searchParams,
  cameTrue,
}: {
  params: WishParams;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  cameTrue: boolean;
}) {
  const p = await params;
  const id = parseWishId(p.id);
  if (!id) notFound();
  const cached = await getWish(id);
  if (!cached) notFound();

  // Share URLs 404 once their card is gone (src/proxy.ts sets the status).
  const target = targetOf(p, cameTrue);
  const highlighted = target && target !== "came-true" ? liveLinkBy(cached.links, target.by) : undefined;
  if (target && (cached.removed || (target === "came-true" ? !wisherCardLink(cached.links) : !highlighted))) notFound();

  const [{ developer }, live, viewer, sp] = await Promise.all([
    getViewer().catch(() => ({ developer: null })),
    getLiveMetoos([id]),
    getViewerWishState(id),
    searchParams,
  ]);
  const [wish] = withLiveCounts([cached], live);
  const metooActive = live.mine.includes(id);
  const metoo = { active: metooActive, count: wish.metoo_count };
  const viewerLink = developer ? wish.links.find((l) => l.developer.id === developer.id) : undefined;
  const claimed = Boolean(developer && wish.claims.some((c) => c.developer.id === developer.id));
  const path = wishPath(wish.id);
  const text = wish.text ?? "";
  const shareText = `I wish there was an app: “${text}”`;
  const wishShare = { ...wish, text };
  const cameTrueLink = viewer.is_wisher ? wisherCardLink(wish.links) : undefined;

  return (
    <>
      {!wish.removed && wish.text && <JsonLd data={wishSchema({ ...wish, text: wish.text })} />}
      {sp.posted === "1" && !wish.removed && (
        <PostedMoment
          wishId={wish.id}
          path={path}
          text={shareText}
          image={wishCardSrc(wish)}
          filename={cardFilename(wish.id)}
          askEmail={viewer.is_wisher && !viewer.subscribed}
        />
      )}
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
        <Link href="/wishes" className="inline-flex items-center gap-2 text-label font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> All wishes
        </Link>
        <span className="font-mono text-label-sm text-outline">{wishLabel(wish.id)}</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-10 lg:col-span-8">
          {wish.removed ? (
            <RemovedHero wish={wish} />
          ) : (
            <WishHero wish={wish} metooActive={metooActive} viewer={viewer} />
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
                        highlight={link.id === highlighted?.id}
                        isAdmin={Boolean(developer?.is_admin)}
                        share={viewerLink?.id === link.id ? developerShare(wishShare, link) : undefined}
                        wisherShare={viewer.is_wisher ? wisherShare(wishShare, wisherCardLink(wish.links, link.id)!) : undefined}
                      />
                    );
                    return (
                      <li key={link.id}>
                        <FlaggedLink handle={link.developer.handle} flagged={link.verdict === "flagged"}>
                          {card}
                        </FlaggedLink>
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
                <ShareTargets path={path} text={shareText} card="wish">
                  <DownloadImageButton src={wishCardSrc(wish)} filename={cardFilename(wish.id)} path={path} card="wish" />
                </ShareTargets>
              </div>
              {cameTrueLink && (
                <ShareMomentButton
                  share={wisherShare(wishShare, cameTrueLink)}
                  label="Share that your wish came true"
                  className="mt-4 rounded-full bg-leaf-soft px-4 py-2 hover:no-underline"
                />
              )}
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
          {!wish.removed && (
            <Suspense>
              <RelatedWishes wishId={wish.id} />
            </Suspense>
          )}
          {developer?.is_admin && !wish.removed && (
            <section className="card p-6" aria-labelledby="admin-title">
              <h2 id="admin-title" className="mb-1 text-label font-semibold tracking-wider text-ink uppercase">
                Admin
              </h2>
              <p className="mb-4 text-label-sm text-ink-muted">Hides the text for everyone and resolves its reports.</p>
              <ModerationActions wishId={wish.id} />
            </section>
          )}
        </aside>
      </div>

      {!wish.removed && (
        <>
          <PostLinkModal
            wishId={wish.id}
            wishText={text}
            metooCount={wish.metoo_count}
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
  highlight,
  isAdmin,
  share,
  wisherShare,
}: {
  link: WishLink;
  wishId: number;
  firstToShip: boolean;
  viewer: ViewerWishState;
  metoo: { active: boolean; count: number };
  ownLink: boolean;
  /** Opened from this developer's share URL. */
  highlight: boolean;
  isAdmin: boolean;
  /** Set on the viewer's own link. */
  share?: ShareMomentProps;
  wisherShare?: ShareMomentProps;
}) {
  return (
    <div
      id={`link-${link.id}`}
      className={clsx("card scroll-mt-24 overflow-hidden", highlight && "ring-2 ring-amber ring-offset-2 ring-offset-surface")}
    >
      {highlight && <ScrollIntoView id={`link-${link.id}`} />}
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
        wisherShare={wisherShare}
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
          {share && link.verdict !== "flagged" && <ShareMomentButton share={share} />}
          {ownLink ? <RemoveOwnLink linkId={link.id} compact /> : <ReportButton wishId={wishId} linkId={link.id} />}
        </div>
      </div>
      {isAdmin && !ownLink && (
        <div className="border-t border-hairline px-5 py-3">
          <ModerationActions wishId={wishId} linkId={link.id} />
        </div>
      )}
    </div>
  );
}

function WishHero({
  wish,
  metooActive,
  viewer,
}: {
  wish: WishDetail;
  metooActive: boolean;
  viewer: ViewerWishState;
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
      <EmailOptIn
        wishId={wish.id}
        isWisher={viewer.is_wisher}
        subscribed={viewer.subscribed}
        metoo={{ active: metooActive, count: wish.metoo_count }}
        className="mt-4"
      />
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
      {!wish.removed && (
        <div className="mt-5 border-t border-hairline pt-4">
          <ReportButton wishId={wish.id}>
            <Flag className="size-3.5" aria-hidden /> Report this wish
          </ReportButton>
        </div>
      )}
    </section>
  );
}

async function RelatedWishes({ wishId }: { wishId: number }) {
  const wishes = await getRelatedWishes(wishId).catch(() => []);
  if (wishes.length === 0) return null;
  return (
    <section className="card p-5" aria-labelledby="related-title">
      <h2 id="related-title" className="mb-3 text-label font-semibold tracking-wider text-ink uppercase">
        People also wished for
      </h2>
      <ul className="space-y-1">
        {wishes.map((w) => (
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

function ShareCardPreview({ wish }: { wish: WishDetail }) {
  const host = new URL(siteUrl()).host;
  return (
    <figure className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface-low" aria-label="Share card preview">
      <div className="relative p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-label font-semibold text-ink">
            <LogoMark className="size-5" />
            Wishcode
          </span>
          <StatusChip status={wish.status} verified={wish.verified} />
        </div>
        <p className="mt-6 line-clamp-3 font-serif text-[22px] leading-8 text-ink sm:text-[26px] sm:leading-9">“{wish.text}”</p>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-surface-lowest/70 px-6 py-3 text-label-sm text-ink-muted sm:px-8">
        <span className="flex flex-wrap items-center gap-x-3">
          {wish.status === "fulfilled" && wish.first_link ? (
            <>
              <span>
                Fulfilled by <strong className="text-ink">@{wish.first_link.developer.handle}</strong>
              </span>
              <span aria-hidden>•</span>
              <span className="font-mono text-primary">{domainOf(wish.first_link.url)}</span>
            </>
          ) : (
            <span className="font-semibold text-primary tabular">{formatNumber(peopleCount(wish.metoo_count))} people want this</span>
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
