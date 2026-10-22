import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "About",
  description: "Why Wishcode exists, who runs it, and how to report issues or send feedback.",
};

const FEEDBACK_EMAIL = "raghavg2705@gmail.com";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">About</h1>
      <p className="mt-4 font-serif text-[20px] leading-8 text-ink-muted italic">
        Wishcode is where people post apps they wish existed, and developers build them. It&apos;s run by me, {OPERATOR}.
      </p>
      <section className="mt-12 border-l-2 border-amber pl-6">
        <h2 className="font-serif text-headline font-semibold text-ink">Why I built this</h2>
        <div className="mt-3 space-y-4 font-serif text-[18px] leading-8 text-ink">
          <p>
            I built this because I believe my countrymen are the brightest people in the world, shining in every field. I
            don&apos;t want a single brilliant idea of theirs to go unbuilt just because of a technical gap or a lack of
            time.
          </p>
          <p>
            Building and shipping have become very fast. But great ideas haven&apos;t. They still sit and wait. But not
            anymore. Wishcode is here.
          </p>
          <p>
            It&apos;s simple: post an idea, see how many people in the world want the same thing, and wait until a
            developer brings it to life.
          </p>
        </div>
      </section>
      <p className="mt-12 font-serif text-[22px] leading-8 text-ink">Made in India ☺️, for the world ❤️</p>
      <section className="card mt-10 p-6">
        <h2 className="font-serif text-headline font-semibold text-ink">Get in touch</h2>
        <p className="mt-1 text-[15px] leading-6 text-ink-muted">
          Found a bug, have feedback, or just want to say hi? Email me and I&apos;ll get back to you.
        </p>
        <a
          href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Wishcode feedback")}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-label font-semibold text-on-amber hover:bg-amber-hover"
        >
          <Mail className="size-4" aria-hidden />
          Report issues, give feedback or contact me
        </a>
        <p className="mt-3 text-caption text-ink-muted">{FEEDBACK_EMAIL}</p>
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/wishes#compose" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          Make a wish
        </Link>
        <Link href="/principles" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          How it works
        </Link>
      </div>
    </main>
  );
}
