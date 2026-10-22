import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GithubIcon } from "@/components/icons";
import { ClosingStar } from "@/components/landing/closing-star";
import { Hero } from "@/components/landing/hero";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { StarMark } from "@/components/landing/star-mark";
import { WishStory } from "@/components/landing/wish-story";
import { buttonStyles } from "@/components/ui";
import { getStats } from "@/lib/data";
import { formatNumber, pluralize } from "@/lib/format";
import { wishPath } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FOR_DEVELOPERS = [
  "Claiming is a heads-up, not a lock. Lots of people can build the same wish.",
  "No deadlines, and nobody to ask permission.",
  "When the people who wanted it say your build works, I'll email you.",
  "Everything you post shows on your public profile.",
];

export default function LandingPage() {
  return (
    <main className="pb-6">
      <SmoothScroll />
      <Hero
        footnote={
          <Suspense>
            <WishCount />
          </Suspense>
        }
      />
      <WishStory />
      <Suspense>
        <MostWanted />
      </Suspense>
      <ForDevelopers />
      <Closing />
    </main>
  );
}

async function WishCount() {
  const stats = await getStats().catch(() => null);
  if (!stats?.counts.all) return null;
  return (
    <p className="text-label text-surface-dim/80">
      {pluralize(stats.counts.all, "wish", "wishes")} so far, and {formatNumber(stats.counts.fulfilled)} came true.
    </p>
  );
}

async function MostWanted() {
  const stats = await getStats().catch(() => null);
  const items = stats?.most_wanted.slice(0, 5) ?? [];
  if (!items.length) return null;
  return (
    <section aria-labelledby="wanted-title" className="mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h2
            id="wanted-title"
            className="font-serif text-[clamp(2.4rem,4.6vw,3.75rem)] leading-[1] font-normal tracking-[-0.03em] text-ink"
          >
            Wished for most right now
          </h2>
          <p className="mt-4 text-[17px] text-ink-muted">Lots of people want these. Nobody&apos;s built them yet.</p>
        </div>
        <Link
          href="/wishes?status=open&sort=top"
          className="text-label font-semibold text-primary underline decoration-amber/60 decoration-2 underline-offset-4 hover:decoration-amber"
        >
          See every open wish
        </Link>
      </div>
      <ol className="mt-10 border-t border-outline-variant">
        {items.map((w) => (
          <li key={w.id} className="border-b border-outline-variant">
            <Link href={wishPath(w.id)} className="group flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10">
              <span className="font-serif text-[clamp(1.3rem,2.4vw,1.75rem)] leading-snug text-ink decoration-amber decoration-2 underline-offset-[6px] group-hover:underline">
                {w.text}
              </span>
              <span className="shrink-0 text-label text-ink-muted tabular">
                <span className="font-semibold text-ink">{formatNumber(w.metoo_count)}</span>{" "}
                {w.metoo_count === 1 ? "person wants" : "people want"} this
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
      className="mx-auto grid w-full max-w-[1120px] gap-12 px-4 pb-24 sm:px-6 sm:pb-32 lg:grid-cols-12 lg:gap-8"
    >
      <div className="lg:col-span-6">
        <h2
          id="dev-title"
          className="font-serif text-[clamp(2.4rem,4.6vw,3.75rem)] leading-[1] font-normal tracking-[-0.03em] text-balance text-ink"
        >
          Build something people already asked for
        </h2>
        <p className="mt-5 max-w-[46ch] text-[17px] leading-7 text-ink-muted">
          Every wish shows how many people want it. Pick one, build it however you like, and post the link. The people
          who wanted it tell you if it works.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={`${buttonStyles.dark} h-12 rounded-xl px-5 text-[15px]`}>
            <GithubIcon className="size-[18px]" />
            Connect GitHub
          </Link>
          <Link href="/wishes?status=open&sort=top" className={`${buttonStyles.quiet} h-12 rounded-xl px-5 text-[15px]`}>
            Find a wish to build
          </Link>
        </div>
      </div>
      <ul className="space-y-6 self-end lg:col-span-5 lg:col-start-8">
        {FOR_DEVELOPERS.map((line) => (
          <li key={line} className="flex gap-4 text-[16px] leading-7 text-ink">
            <span className="mt-0.5 size-6 shrink-0 rounded-[7px] bg-ink p-[3px]">
              <StarMark className="size-full" />
            </span>
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
      className="relative mx-2 overflow-hidden rounded-[28px] bg-ink bg-[linear-gradient(180deg,#1d1b45_0%,#15133a_100%)] text-inverse-ink sm:mx-3 sm:rounded-[36px]"
    >
      <div className="mx-auto grid max-w-[1120px] items-end gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2
            id="closing-title"
            className="font-serif text-[clamp(2.6rem,6vw,5rem)] leading-[0.98] font-normal tracking-[-0.03em]"
          >
            What do you wish existed?
          </h2>
          <p className="mt-5 text-[17px] text-surface-dim">One sentence is enough. You don&apos;t need an account.</p>
          <Link
            href="/wishes#compose"
            className="mt-8 inline-flex h-12 items-center rounded-xl bg-amber px-6 text-[15px] font-semibold text-on-amber shadow-[0_8px_30px_-8px_rgba(244,183,64,0.6)] transition-[background-color,transform] hover:bg-amber-hover active:scale-[0.98]"
          >
            Make a wish
          </Link>
        </div>
        <ClosingStar className="hidden w-[clamp(120px,14vw,190px)] justify-self-end lg:col-span-4 lg:block" />
      </div>
    </section>
  );
}
