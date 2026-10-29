import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { FAQ } from "@/lib/faq";
import { PRINCIPLES } from "@/lib/principles";
import { faqSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How Wishcode works",
  description: "How Wishcode works: anyone can wish, developers build, and the people who wanted it decide if it works.",
  path: "/principles",
});

export default function PrinciplesPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">How it works</h1>
      <p className="mt-4 font-serif text-[20px] leading-8 text-ink-muted italic">
        Wishcode is where people post apps they wish existed, and developers build them. Here is how I run it.
      </p>
      <ol className="mt-10 space-y-4">
        {PRINCIPLES.map((p, i) => (
          <li key={p.title} className="card flex gap-5 p-6">
            <span className="font-serif text-[28px] leading-8 text-amber tabular">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-serif text-headline font-semibold text-ink">{p.title}</h2>
              <p className="mt-1 text-[15px] leading-6 text-ink-muted">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-14" aria-labelledby="faq-title">
        <JsonLd data={faqSchema(FAQ)} />
        <h2 id="faq-title" className="font-serif text-headline font-semibold text-ink">
          Questions
        </h2>
        <dl className="mt-4 divide-y divide-hairline">
          {FAQ.map((q) => (
            <div key={q.question} className="py-5">
              <dt className="text-[16px] leading-6 font-semibold text-ink">{q.question}</dt>
              <dd className="mt-1 text-[15px] leading-6 text-ink-muted">{q.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/wishes#compose" className="rounded-lg bg-amber px-5 py-2.5 text-label font-semibold text-on-amber hover:bg-amber-hover">
          Make a wish
        </Link>
        <Link href="/login" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          Connect GitHub to build
        </Link>
      </div>
    </main>
  );
}
