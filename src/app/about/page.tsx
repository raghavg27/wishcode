import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CodehypeBadge } from "@/components/codehype-badge";
import { CONTACT_EMAIL, OPERATOR } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { SUPPORT_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About and contact",
  description: "Why Wishcode exists, who runs it, and how to report issues or send feedback.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">About</h1>
      <p className="mt-4 font-serif text-[20px] leading-8 text-ink-muted italic">
        Wishcode is where people post apps they wish existed, and developers build them. It is run by me, {OPERATOR}.
      </p>
      <section className="mt-12 border-l-2 border-amber pl-6">
        <h2 className="font-serif text-headline font-semibold text-ink">Why I built this</h2>
        <div className="mt-3 space-y-4 font-serif text-[18px] leading-8 text-ink">
          <p>
            I built this because I believe my countrymen are the brightest people in the world, shining in every field. I
            do not want a single brilliant idea of theirs to go unbuilt just because of a technical gap or a lack of
            time.
          </p>
          <p>
            Building and shipping have become very fast. But great ideas have not. They still sit and wait. But not
            anymore. Wishcode is here.
          </p>
          <p>
            It is simple: post an idea, see how many people in the world want the same thing, and wait until a
            developer brings it to life.
          </p>
        </div>
      </section>
      <p className="mt-12 font-serif text-[22px] leading-8 text-ink">Made in India ☺️, for the world ❤️</p>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">
        Wishcode is free, and I keep it running myself. If you like it or it has been useful to you, you can{" "}
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          buy me a coffee ☕ or a mansion 🏠
        </a>
        .
      </p>
      <section className="card mt-10 p-6">
        <h2 className="font-serif text-headline font-semibold text-ink">Get in touch</h2>
        <p className="mt-1 text-[15px] leading-6 text-ink-muted">
          Found a bug, have feedback, or just want to say hi? Email me and I will get back to you.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Wishcode feedback")}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-label font-semibold text-on-amber hover:bg-amber-hover"
        >
          <Mail className="size-4" aria-hidden />
          Report issues, give feedback or contact me
        </a>
        <p className="mt-3 text-caption text-ink-muted">{CONTACT_EMAIL}</p>
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/wishes#compose" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          Make a wish
        </Link>
        <Link href="/principles" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          How it works
        </Link>
      </div>
      <CodehypeBadge className="mt-12 w-[180px]" />
    </main>
  );
}
