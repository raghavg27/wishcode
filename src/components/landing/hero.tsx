"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { gsap, REDUCED_MOTION, SplitText, useGSAP } from "@/components/landing/gsap";
import { NightSky } from "@/components/landing/night-sky";
import { StarMark } from "@/components/landing/star-mark";

/**
 * The night panel: the logo mark at full size. On load a gold star flies in
 * along the mark's diagonal and settles top right, and the headline rises in
 * its wake. Elements marked data-intro start hidden (see globals.css) and
 * show on their own if this script never runs.
 */
export function Hero({ footnote }: { footnote?: React.ReactNode }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const root = scope.current!;
      const intro = root.querySelectorAll<HTMLElement>("[data-hero-star], [data-hero-title], [data-hero-rest]");
      const reveal = () => intro.forEach((el) => el.removeAttribute("data-intro"));
      if (window.matchMedia(REDUCED_MOTION).matches) return reveal();

      gsap.set(intro, { autoAlpha: 0 });
      reveal();

      let alive = true;
      const play = contextSafe!(() => {
        if (!alive) return;
        const star = root.querySelector<HTMLElement>("[data-hero-star]")!;
        const title = root.querySelector<HTMLElement>("[data-hero-title]")!;
        const { width, height } = root.getBoundingClientRect();
        const travel = Math.min(width * 0.55, height * 0.75);
        const split = SplitText.create(title, { type: "lines", mask: "lines" });

        gsap
          .timeline({ defaults: { ease: "expo.out" }, onComplete: () => split.revert() })
          .set(title, { autoAlpha: 1 })
          .fromTo(
            star,
            { x: -travel, y: travel, scale: 0.35, autoAlpha: 0 },
            { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 1.5, ease: "power3.out" },
            0,
          )
          .fromTo(star.querySelector("[data-trail]"), { scale: 3.2, svgOrigin: "40 24" }, { scale: 1, svgOrigin: "40 24", duration: 1.5, ease: "power3.out" }, 0)
          .fromTo(
            star.querySelector("[data-core]"),
            { rotation: -90, scale: 0.8, svgOrigin: "40 24" },
            { rotation: 0, scale: 1, svgOrigin: "40 24", duration: 1.1, ease: "back.out(3)" },
            1.05,
          )
          .from(split.lines, { yPercent: 108, duration: 1.2, stagger: 0.12 }, 0.45)
          .to(root.querySelectorAll("[data-hero-rest]"), { autoAlpha: 1, duration: 0.01 }, 0.9)
          .from(root.querySelectorAll("[data-hero-rest] > *"), { autoAlpha: 0, y: 18, duration: 1, stagger: 0.08 }, 0.9);
      });
      document.fonts.ready.then(play);
      return () => {
        alive = false;
      };
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      aria-labelledby="hero-title"
      className="relative isolate mx-2 mt-2 overflow-hidden rounded-[28px] bg-ink text-inverse-ink sm:mx-3 sm:rounded-[36px]"
    >
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(40%_45%_at_86%_16%,rgba(244,183,64,0.09),transparent_70%),radial-gradient(70%_60%_at_10%_100%,rgba(110,107,200,0.18),transparent_70%),linear-gradient(180deg,#1d1b45_0%,#15133a_100%)]"
        aria-hidden
      />
      <NightSky className="absolute inset-0 -z-10" />

      <div
        data-intro
        data-hero-star
        className="pointer-events-none absolute top-[10%] right-[7%] w-[clamp(88px,12vw,168px)] drop-shadow-[0_0_28px_rgba(244,183,64,0.5)]"
      >
        <StarMark className="w-full" />
      </div>

      <div className="mx-auto flex min-h-[calc(100svh-9rem)] max-w-[1120px] flex-col justify-end px-5 pt-44 pb-12 sm:min-h-[calc(100svh-5.5rem)] sm:px-8 sm:pb-16 lg:max-h-[960px]">
        <h1
          id="hero-title"
          data-intro
          data-hero-title
          className="font-serif text-[clamp(2.9rem,7.4vw,6.6rem)] leading-[0.94] font-normal tracking-[-0.03em]"
        >
          <span className="block">Wish for an app.</span>
          <span className="block">Someone might build it.</span>
        </h1>
        <div data-intro data-hero-rest className="mt-8 flex flex-col gap-8 sm:mt-10">
          <p className="max-w-[46ch] text-[17px] text-pretty leading-7 text-surface-dim sm:text-[19px] sm:leading-8">
            Write one sentence about the app you wish existed. No signup. Developers see how many people want it, and
            build it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/wishes#compose"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber px-5 text-[15px] font-semibold text-on-amber shadow-[0_8px_30px_-8px_rgba(244,183,64,0.6)] transition-[background-color,transform] hover:bg-amber-hover active:scale-[0.98]"
            >
              <Plus className="size-[18px]" aria-hidden />
              Make a wish
            </Link>
            <Link
              href="/wishes"
              className="inline-flex h-12 items-center rounded-xl px-5 text-[15px] font-medium text-inverse-ink ring-1 ring-inverse-ink/25 transition-colors ring-inset hover:bg-inverse-ink/[0.06]"
            >
              See all wishes
            </Link>
          </div>
          {/* Its own wrapper: footnote streams in, and gsap must only touch hydrated markup. */}
          <div className="empty:hidden">{footnote}</div>
        </div>
      </div>
    </section>
  );
}
