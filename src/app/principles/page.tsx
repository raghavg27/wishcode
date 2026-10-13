import type { Metadata } from "next";
import Link from "next/link";
import { DISCLAIMER, LIMITS, WISH_MAX, WISH_MIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Principles",
  description: "How the Wishcode ledger works: anonymous wishes, open claims, and live links.",
};

const PRINCIPLES = [
  {
    title: "Anyone can wish",
    body: `Post a one-sentence wish (${WISH_MIN}–${WISH_MAX} characters) without an account or email. Wishes are anonymous and permanent; only moderators remove spam.`,
  },
  {
    title: "Demand is public",
    body: "Every wish shows its me-too count, who is building it, and every live link posted against it. One me-too per device per wish, and you can take it back.",
  },
  {
    title: "Claims are a signal, not a lock",
    body: "Developers who connect GitHub can say “I'm building this”. Claims never expire, and many developers can claim the same wish. Claiming is never required before shipping.",
  },
  {
    title: "Fulfilled means a live link exists",
    body: "The first live link marks a wish Fulfilled. Nothing is checked, reviewed or voted on first. Other developers can still add their own builds, and all of them show.",
  },
  {
    title: "Links open at your own discretion",
    body: `${DISCLAIMER} Links always open in a new tab, carry the developer's GitHub identity, and can be removed by their author or a moderator.`,
  },
  {
    title: "Fair use",
    body: `To keep the ledger useful: ${LIMITS.wishesPerDevicePerDay} wishes and ${LIMITS.metoosPerDevicePerDay} me-toos per device per day (${LIMITS.wishesPerNetworkPerDay} wishes and ${LIMITS.metoosPerNetworkPerDay} me-toos per shared network), and ${LIMITS.claimsPerDeveloperPerDay} claims and ${LIMITS.linksPerDeveloperPerDay} links per developer per day. Limits reset at midnight UTC.`,
  },
];

export default function PrinciplesPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <p className="text-label-sm font-semibold tracking-wider text-primary uppercase">Charter</p>
      <h1 className="mt-2 font-serif text-display-sm text-ink sm:text-display">How the ledger works</h1>
      <p className="mt-4 font-serif text-[20px] leading-8 text-ink-muted italic">
        Wishcode is a public ledger of software wishes. People wish for everyday tools; independent builders make them real.
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
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/#compose" className="rounded-lg bg-amber px-5 py-2.5 text-label font-semibold text-on-amber hover:bg-amber-hover">
          Make a wish
        </Link>
        <Link href="/login" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          Connect GitHub to build
        </Link>
      </div>
    </main>
  );
}
