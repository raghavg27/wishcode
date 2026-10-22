"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { REDUCED_MOTION } from "@/components/landing/gsap";
import { WISH_MAX } from "@/lib/config";
import { writeDraft } from "@/lib/draft";
import { normalizeWishText } from "@/lib/validation";

const LEAD = "An app that ";

// Examples only: typed out while the field is empty, never posted.
const EXAMPLES = [
  "mutes my mic when the dog starts barking.",
  "tells me which of my plants I forgot to water.",
  "splits a dinner bill from a photo of the receipt.",
  "turns my voice memos into a to-do list.",
  "reminds me to call my grandmother on Sundays.",
];

/**
 * The end of the sentence "I wish there was an app that…", typed straight
 * into the page at headline size. Making the wish carries the text over to
 * the composer on /wishes as a draft, where it's checked and posted.
 */
export function WishPrompt({
  labelledBy,
  size = "hero",
  className,
}: {
  labelledBy: string;
  size?: "hero" | "compact";
  className?: string;
}) {
  const router = useRouter();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const example = useTypewriter(!value && !focused);

  // Grow with the text instead of scrolling inside the field.
  useLayoutEffect(() => {
    const field = fieldRef.current!;
    const fit = () => {
      field.style.height = "auto";
      field.style.height = `${field.scrollHeight}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);

  function makeWish() {
    const text = normalizeWishText(value).replace(/^(an app )?that\s+/i, "");
    if (!text) return fieldRef.current?.focus();
    writeDraft(LEAD + text);
    router.push("/wishes#compose");
  }

  const hero = size === "hero";
  const type = hero
    ? // Room for the longest example, so the line below doesn't jump as they type.
      "min-h-[3lh] text-[clamp(2.4rem,6.2vw,5.75rem)] leading-[1.02] tracking-[-0.025em] sm:min-h-[2lh]"
    : "text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] tracking-[-0.02em]";

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        makeWish();
      }}
    >
      {/* The example sits in the same grid cell as the field, so a long one
          pushes the line down instead of spilling over it. */}
      <div className="grid border-b border-inverse-ink/20 pb-3 transition-colors focus-within:border-amber">
        <textarea
          ref={fieldRef}
          rows={1}
          value={value}
          maxLength={WISH_MAX - LEAD.length}
          aria-labelledby={labelledBy}
          onChange={(e) => setValue(e.target.value.replace(/\n/g, " "))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              makeWish();
            }
          }}
          className={clsx(
            "block w-full resize-none self-start overflow-hidden bg-transparent [grid-area:1/1] font-serif font-light text-inverse-ink italic caret-amber outline-none",
            type,
          )}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        {!value && (
          <p
            aria-hidden
            className={clsx(
              "pointer-events-none font-serif [grid-area:1/1] font-light text-inverse-ink/40 italic",
              type,
            )}
          >
            {focused ? " " : example}
            {!focused && <span className="ml-[0.06em] inline-block h-[0.82em] w-[0.06em] translate-y-[0.1em] animate-pulse bg-amber" />}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-amber pr-6 pl-5 text-[15px] font-semibold text-on-amber shadow-[0_10px_40px_-10px_rgba(244,183,64,0.7)] transition-[background-color,transform] hover:bg-amber-hover active:scale-[0.97]"
        >
          <Plus className="size-[18px]" aria-hidden />
          Make a wish
        </button>
        {hero && (
          <Link
            href="/wishes"
            className="inline-flex h-12 items-center rounded-full px-5 text-[15px] font-medium text-inverse-ink/85 transition-colors hover:bg-inverse-ink/[0.07] hover:text-inverse-ink"
          >
            See all wishes
          </Link>
        )}
        <span className="text-label text-inverse-ink/45 max-sm:hidden">or press Enter</span>
      </div>
    </form>
  );
}

/** Types each example out, holds it, deletes it, and moves to the next. */
function useTypewriter(running: boolean) {
  const [text, setText] = useState(EXAMPLES[0]);
  const state = useRef({ example: 0, length: EXAMPLES[0].length, deleting: true, hold: 2600 });

  useEffect(() => {
    if (!running || window.matchMedia(REDUCED_MOTION).matches) return;
    let timer = 0;
    const step = () => {
      const s = state.current;
      const full = EXAMPLES[s.example];
      let delay: number;
      if (s.hold > 0) {
        delay = s.hold;
        s.hold = 0;
      } else if (s.deleting) {
        s.length -= 1;
        delay = 18;
        if (s.length <= 0) {
          s.deleting = false;
          s.example = (s.example + 1) % EXAMPLES.length;
          delay = 380;
        }
      } else {
        s.length += 1;
        // A little unevenness reads as a person typing.
        delay = 38 + Math.random() * 55;
        if (s.length >= full.length) {
          s.deleting = true;
          s.hold = 2600;
        }
      }
      setText(EXAMPLES[s.example].slice(0, Math.max(0, s.length)));
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, 1800);
    return () => clearTimeout(timer);
  }, [running]);

  return text;
}
