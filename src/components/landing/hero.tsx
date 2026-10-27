"use client";

import { useRef } from "react";
import { gsap, REDUCED_MOTION, SplitText, useGSAP } from "@/components/landing/gsap";
import { StarMark } from "@/components/landing/star-mark";
import { WishPrompt } from "@/components/landing/wish-prompt";

/**
 * The first screen: the night sky (drawn by the page behind it) and the
 * sentence "I wish there was an app that…", which you finish right here. On
 * load a gold star flies in along the mark's diagonal and settles top right,
 * and the headline rises in its wake. Elements marked data-intro start hidden
 * (see globals.css) and show on their own if this script never runs.
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
          .to(root.querySelectorAll("[data-hero-rest]"), { autoAlpha: 1, duration: 0.01 }, 0.8)
          .from(root.querySelectorAll("[data-hero-rest] > *"), { autoAlpha: 0, y: 24, duration: 1.1, stagger: 0.1 }, 0.8);
      });
      document.fonts.ready.then(play);
      return () => {
        alive = false;
      };
    },
    { scope },
  );

  return (
    <section ref={scope} aria-labelledby="hero-title" className="relative isolate">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(38%_42%_at_84%_18%,rgba(244,183,64,0.10),transparent_70%),radial-gradient(60%_50%_at_0%_100%,rgba(110,107,200,0.16),transparent_70%)]"
        aria-hidden
      />

      <div
        data-intro
        data-hero-star
        className="pointer-events-none absolute top-[15%] right-[6%] w-[clamp(76px,11vw,164px)] drop-shadow-[0_0_32px_rgba(244,183,64,0.55)] sm:top-[17%]"
      >
        <StarMark className="w-full" />
      </div>

      <div className="mx-auto flex min-h-[max(640px,100svh)] max-w-[1280px] flex-col justify-end px-5 pt-36 pb-14 sm:px-10 sm:pb-20 lg:max-h-[1000px]">
        <h1
          id="hero-title"
          data-intro
          data-hero-title
          className="max-w-[14ch] font-serif text-[clamp(2.4rem,6.2vw,5.75rem)] leading-[1.02] font-light tracking-[-0.025em] text-balance sm:max-w-none"
        >
          I wish there was an app that
        </h1>

        <div data-intro data-hero-rest className="mt-1 sm:mt-2">
          <WishPrompt labelledBy="hero-title" />
          <div className="mt-14 flex flex-col gap-6 sm:mt-20 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <p className="max-w-[44ch] text-[16px] leading-7 text-pretty text-inverse-ink/70 sm:text-[17px]">
              Finish the sentence. You do not need an account. Developers see how many people want each wish, and
              build the ones they like.
            </p>
            {/* Its own wrapper: footnote streams in, and gsap must only touch hydrated markup. */}
            <div className="empty:hidden">{footnote}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
