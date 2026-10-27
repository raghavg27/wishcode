import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GithubIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ClosingStar } from "@/components/landing/closing-star";
import { Hero } from "@/components/landing/hero";
import { NightSky } from "@/components/landing/night-sky";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Sparkle } from "@/components/landing/star-mark";
import { WishPrompt } from "@/components/landing/wish-prompt";
import { WishStory } from "@/components/landing/wish-story";
import { getStats } from "@/lib/data";
import { formatNumber, pluralize } from "@/lib/format";
import { pageMetadata, SITE_DESCRIPTION, siteSchema } from "@/lib/seo";
import { wishPath } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ description: SITE_DESCRIPTION, path: "/" });

const FOR_DEVELOPERS = [
  "Claiming is a heads-up, not a lock. Lots of people can build the same wish.",
  "No deadlines, and nobody to ask permission.",
  "When the people who wanted it say your build works, I'll email you.",
  "Everything you post shows on your public profile.",
];

const SECTION_TITLE = "font-serif text-[clamp(2.5rem,4.8vw,4.25rem)] leading-[1] font-light tracking-[-0.03em] text-balance";

/**
 * One night: the page opens under a starry sky, the story of a wish runs
 * until dawn, the middle of the page is daylight, and it ends at dusk with
 * the sky (and the question) back again.
 */
export default function LandingPage() {
  return (
    <main>
      <JsonLd data={siteSchema()} />
      <SmoothScroll />
      {/* Slides under the sticky header, which turns night blue over data-night. */}
      <div data-night className="relative -mt-16 bg-[linear-gradient(180deg,var(--color-midnight)_0%,var(--color-ink)_100%)] text-inverse-ink [overflow-x:clip]">
        <div className="pointer-events-none sticky top-0 -mb-[100svh] h-svh" aria-hidden>
          <NightSky className="size-full" />
        </div>
        <Hero
          footnote={
            <Suspense>
              <WishCount />
            </Suspense>
          }
        />
        <WishStory />
      </div>
      <Daybreak />
      <Suspense>
        <MostWanted />
      </Suspense>
      <ForDevelopers />
      <Closing />
    </main>
  );
}

/** Night into day. The top half still counts as night for the header. */
function Daybreak() {
  return (
    <div aria-hidden className="relative h-[70vh] min-h-[420px]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-ink)_0%,#3b3368_22%,#7d6189_46%,#cf9e8f_68%,#f1d6bd_84%,var(--color-surface)_100%)]" />
      <div data-night className="absolute inset-x-0 top-0 h-1/3" />
    </div>
  );
}

async function WishCount() {
  const stats = await getStats().catch(() => null);
  if (!stats?.counts.all) return null;
  return (
    <p className="text-label text-inverse-ink/55 tabular sm:text-right">
      {pluralize(stats.counts.all, "wish", "wishes")} so far.
      <br className="max-sm:hidden" /> {formatNumber(stats.counts.fulfilled)} came true.
    </p>
  );
}

async function MostWanted() {
  const stats = await getStats().catch(() => null);
  const items = stats?.most_wanted.slice(0, 5) ?? [];
  if (!items.length) return null;
  return (
    <section aria-labelledby="wanted-title" className="mx-auto w-full max-w-[1280px] px-5 pt-8 pb-28 sm:px-10 sm:pb-40">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h2 id="wanted-title" className={`${SECTION_TITLE} text-ink`}>
            Wished for most right now
          </h2>
          <p className="mt-4 text-[17px] text-ink-muted">Lots of people want these. Nobody&apos;s built them yet.</p>
        </div>
        <Link
          href="/wishes?status=open&sort=top"
          className="text-[15px] font-medium text-ink underline decoration-amber decoration-2 underline-offset-[6px] hover:decoration-ink"
        >
          See every open wish
        </Link>
      </div>
      <ol className="mt-12">
        {items.map((w) => (
          <li key={w.id} className="border-t border-ink/10 last:border-b">
            <Link
              href={wishPath(w.id)}
              className="group grid gap-3 py-7 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-12 sm:py-8"
            >
              <span className="font-serif text-[clamp(1.4rem,2.6vw,2.1rem)] leading-[1.2] font-light tracking-[-0.01em] text-ink italic transition-transform duration-300 group-hover:translate-x-2">
                {w.text}
              </span>
              <span className="flex items-baseline gap-2 text-label text-ink-muted">
                <span className="font-serif text-[28px] leading-none text-ink tabular">{formatNumber(w.metoo_count)}</span>
                {w.metoo_count === 1 ? "person wants this" : "people want this"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ForDevelopers() {
  return (
    <section
      aria-labelledby="dev-title"
      className="mx-auto grid w-full max-w-[1280px] gap-14 px-5 pt-8 pb-28 sm:px-10 sm:pb-40 lg:grid-cols-12 lg:gap-10"
    >
      <div className="lg:col-span-6">
        <h2 id="dev-title" className={`${SECTION_TITLE} text-ink`}>
          Build something people already asked for
        </h2>
        <p className="mt-6 max-w-[44ch] text-[17px] leading-7 text-ink-muted">
          Every wish shows how many people want it. Pick one, build it however you like, and post the link. The people
          who wanted it tell you if it works.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-inverse-ink transition-[background-color,transform] hover:bg-inverse active:scale-[0.97]"
          >
            <GithubIcon className="size-[18px]" />
            Connect GitHub
          </Link>
          <Link
            href="/wishes?status=open&sort=top"
            className="inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-ink ring-1 ring-ink/15 transition-colors ring-inset hover:bg-ink/[0.04]"
          >
            Find a wish to build
          </Link>
        </div>
      </div>
      <ul className="self-end lg:col-span-5 lg:col-start-8">
        {FOR_DEVELOPERS.map((line) => (
          <li
            key={line}
            className="flex gap-4 border-t border-ink/10 py-5 font-serif text-[20px] leading-[1.4] text-ink first:border-t-0 first:pt-0 last:pb-0"
          >
            <Sparkle className="mt-[0.3em] size-4 shrink-0" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Closing() {
  return (
    <section
      aria-labelledby="closing-title"
      className="relative isolate bg-[linear-gradient(180deg,var(--color-surface)_0%,#ecd6c3_12%,#9a7b98_26%,var(--color-ink)_40%,var(--color-midnight)_100%)] pt-[38vh] text-inverse-ink"
    >
      <div data-night className="absolute inset-x-0 top-[30vh] bottom-0 -z-10">
        <NightSky className="size-full" />
      </div>
      <div className="mx-auto grid max-w-[1280px] items-end gap-10 px-5 pt-10 pb-28 sm:px-10 sm:pb-36 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 id="closing-title" className="font-serif text-[clamp(2.75rem,6.4vw,5.5rem)] leading-[0.98] font-light tracking-[-0.03em]">
            What do you wish existed?
          </h2>
          <p className="mt-5 text-[17px] text-inverse-ink/70">One sentence is enough. Start with &ldquo;an app that&rdquo;.</p>
          <WishPrompt labelledBy="closing-title" size="compact" className="mt-10" />
        </div>
        <ClosingStar className="hidden w-[clamp(120px,14vw,200px)] justify-self-end lg:col-span-3 lg:col-start-10 lg:block" />
      </div>
    </section>
  );
}
