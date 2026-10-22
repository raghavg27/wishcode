"use client";

import clsx from "clsx";
import { ArrowUpRight, Check, Hand } from "lucide-react";
import { useRef } from "react";
import { gsap, useGSAP } from "@/components/landing/gsap";

const STEPS = [
  {
    title: "Write one sentence.",
    body: "Say what the app should do. No account, no form. Leave an email if you want to hear when it's built.",
  },
  {
    title: "Others tap Me too.",
    body: "Every me-too tells developers how many people want it.",
  },
  {
    title: "A developer builds it.",
    body: "Anyone with GitHub can claim the wish so others know, then post a live link.",
  },
  {
    title: "The people who wanted it check.",
    body: "If the wisher says it works, or three people who me-too'd it do, the wish is marked Fulfilled ✓.",
  },
];

const WISH = "An app that mutes my mic when the dog starts barking.";
const METOOS = 214;

// Same looks as StatusChip, stacked so they can cross-fade.
const CHIPS = [
  { key: "open", label: "Open", className: "border-ink/15 bg-surface-container text-ink" },
  { key: "built", label: "Being built", className: "border-craft-border bg-craft-chip text-craft-ink" },
  { key: "unverified", label: "Fulfilled · unverified", className: "border-amber/50 bg-amber-soft/60 text-primary" },
  { key: "fulfilled", label: "Fulfilled ✓", className: "border-leaf-border bg-leaf-chip/60 text-leaf-ink" },
];

/**
 * "How a wish comes true": on wide screens the section pins and scrolling
 * walks one wish card through the four steps. Everywhere else (and with
 * reduced motion) the card is shown as it ends up: fulfilled and verified.
 */
export function WishStory() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(scope);
        const steps = q("[data-step]");
        const chip = (key: string) => q(`[data-chip="${key}"]`);
        const count = q("[data-count]")[0] as HTMLElement;
        const metoos = { n: 1 };
        count.textContent = "1";

        const tl = gsap.timeline({
          defaults: { ease: "none", duration: 0.2 },
          scrollTrigger: {
            trigger: q("[data-pin]")[0],
            start: "top top",
            end: "+=2600",
            pin: true,
            scrub: 0.6,
          },
        });

        tl.set(steps, { opacity: (i: number) => (i === 0 ? 1 : 0.28) })
          .set(q("[data-char]"), { opacity: 0 })
          .set([chip("built"), chip("unverified"), chip("fulfilled"), q("[data-build]"), q("[data-link]"), q("[data-votes]")], {
            autoAlpha: 0,
          })
          .set(chip("open"), { autoAlpha: 1 })
          .set(q("[data-metoo]"), { backgroundColor: "#eeecf6", borderColor: "rgba(0,0,0,0)" })
          // 1. The wish is typed out.
          .to(q("[data-char]"), { opacity: 1, duration: 0.01, stagger: 0.85 / WISH.length }, 0.05)
          // 2. Me-toos pile up.
          .to(steps, { opacity: (i: number) => (i === 1 ? 1 : 0.28) }, 1)
          .to(q("[data-metoo]"), { backgroundColor: "#f4b740", borderColor: "#f4b740" }, 1.05)
          .to(metoos, { n: METOOS, duration: 0.85, ease: "power1.in", onUpdate: () => void (count.textContent = String(Math.round(metoos.n))) }, 1.1)
          // 3. Claimed, then a link goes up.
          .to(steps, { opacity: (i: number) => (i === 2 ? 1 : 0.28) }, 2)
          // Each swap fades out before the next state fades in, so no scroll
          // position shows two chips at once.
          .to(chip("open"), { autoAlpha: 0, duration: 0.08 }, 2.05)
          .to([chip("built"), q("[data-build]")], { autoAlpha: 1, duration: 0.12 }, 2.15)
          .to([chip("built"), q("[data-build]")], { autoAlpha: 0, duration: 0.08 }, 2.6)
          .to([chip("unverified"), q("[data-link]")], { autoAlpha: 1, duration: 0.12 }, 2.7)
          // 4. The people who wanted it say it works.
          .to(steps, { opacity: (i: number) => (i === 3 ? 1 : 0.28) }, 3)
          .to(q("[data-votes]"), { autoAlpha: 1 }, 3.1)
          .to(chip("unverified"), { autoAlpha: 0, duration: 0.08 }, 3.4)
          .fromTo(chip("fulfilled"), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, ease: "back.out(3)" }, 3.5)
          .to({}, { duration: 0.4 });

        return () => {
          count.textContent = String(METOOS);
        };
      });
    },
    { scope },
  );

  return (
    <section ref={scope} aria-labelledby="story-title" className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
      <div data-pin className="grid gap-12 py-24 sm:py-32 lg:min-h-svh lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-20">
        <div className="lg:col-span-5">
          <h2
            id="story-title"
            className="font-serif text-[clamp(2.4rem,4.6vw,3.75rem)] leading-[1] font-normal tracking-[-0.03em] text-ink"
          >
            How a wish comes true
          </h2>
          <ol className="mt-10 space-y-7">
            {STEPS.map((step, i) => (
              <li key={step.title} data-step className="flex gap-5">
                <span className="w-5 shrink-0 pt-0.5 font-serif text-[22px] leading-7 text-primary tabular">{i + 1}</span>
                <div>
                  <h3 className="font-serif text-[21px] leading-7 font-medium text-ink">{step.title}</h3>
                  <p className="mt-1 max-w-[40ch] text-[15px] leading-6 text-ink-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-[28px] bg-surface-container p-4 sm:p-10 lg:p-12">
            <StoryCard />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A picture of a wish card, in its final state. The steps carry the meaning. */
function StoryCard() {
  return (
    <div
      aria-hidden
      className="card mx-auto max-w-[540px] p-5 shadow-[0_30px_60px_-24px_rgba(29,27,69,0.28)] select-none sm:p-7"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-outline">posted just now</span>
        <span className="grid justify-items-end">
          {CHIPS.map((c) => (
            <span
              key={c.key}
              data-chip={c.key}
              className={clsx(
                "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-label-sm font-semibold whitespace-nowrap [grid-area:1/1]",
                c.className,
                c.key !== "fulfilled" && "invisible opacity-0",
              )}
            >
              {c.key === "built" && <span className="size-1.5 rounded-full bg-craft" />}
              {c.label}
            </span>
          ))}
        </span>
      </div>

      <p className="my-3 min-h-[60px] font-serif text-wish-sm text-ink sm:min-h-[72px] sm:text-wish">
        {WISH.split("").map((c, i) => (
          <span key={i} data-char>
            {c}
          </span>
        ))}
      </p>

      <div className="my-4 grid">
        <div data-build className="invisible flex items-center gap-3 self-center opacity-0 [grid-area:1/1]">
          <YouAvatar />
          <p className="text-label-sm text-ink-muted">
            <strong className="font-medium text-ink">1 developer</strong> building (@you)
          </p>
        </div>
        <div data-link className="rounded-lg bg-surface-low p-3 [grid-area:1/1]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-label-sm text-ink-muted">
              <YouAvatar />
              <span>
                Fulfilled by <span className="font-semibold text-ink">@you</span> just now
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1 text-label-sm font-medium text-ink shadow-card">
              Open app
              <ArrowUpRight className="size-3.5" />
              <span className="text-caption text-outline">mutemymic.app</span>
            </span>
          </div>
          <p data-votes className="mt-3 flex items-center gap-1.5 text-label-sm font-medium text-leaf-ink">
            <Check className="size-4" strokeWidth={2.5} />
            The wisher says it works
          </p>
        </div>
      </div>

      <div className="flex items-center pt-2">
        <span
          data-metoo
          className="inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-amber bg-amber px-3.5 py-1.5 text-label font-semibold text-on-amber"
        >
          <Hand className="size-[18px]" />
          Me too
          <span className="opacity-50">·</span>
          <span data-count className="tabular">
            {METOOS}
          </span>
        </span>
      </div>
    </div>
  );
}

function YouAvatar() {
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-amber">
      YO
    </span>
  );
}
