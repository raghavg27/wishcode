import type { Metadata } from "next";
import Link from "next/link";
import { DISCLAIMER, LIMITS, WISH_MAX, WISH_MIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Principles",
  description: "How Wishcode works: anyone can wish, developers build, and the people who wanted it decide if it works.",
};

const PRINCIPLES = [
  {
    title: "Anyone can wish.",
    body: `Post one sentence (${WISH_MIN}–${WISH_MAX} characters). No account. Leave an email if you want, and I'll tell you when someone builds it. I only use it for that, and every email has an unsubscribe link. Wishes stay up unless they're spam, abusive or share someone's private information.`,
  },
  {
    title: "Everyone can see the demand.",
    body: "Every wish shows how many people want it, who's building it and what they've built. One me-too per device per wish, and you can take it back.",
  },
  {
    title: "Claiming is a heads-up, not a lock.",
    body: "Developers who connect GitHub can say “I'm building this.” Claims never expire, lots of people can claim the same wish, and nobody has to claim before shipping.",
  },
  {
    title: "The people who wanted it decide if it works.",
    body: "When a developer posts a link, the wish shows Fulfilled · unverified. If the wisher says it works, or 3 people who me-too'd it do, it becomes Fulfilled ✓. If enough of them say it doesn't work, the link gets folded away with a warning.",
  },
  {
    title: "Open links with care.",
    body: `${DISCLAIMER} They open in a new tab, show who posted them, and the developer or I can take them down. If a wish or link is spam, abusive, shares someone's private information or looks like a scam, tap Report and I'll review it.`,
  },
  {
    title: "Fair use.",
    body: `To keep things fair: ${LIMITS.wishesPerDevicePerDay} wishes and ${LIMITS.metoosPerDevicePerDay} me-toos per device per day (${LIMITS.wishesPerNetworkPerDay} wishes and ${LIMITS.metoosPerNetworkPerDay} me-toos per shared network), ${LIMITS.claimsPerDeveloperPerDay} claims and ${LIMITS.linksPerDeveloperPerDay} links per developer per day, and ${LIMITS.subscriptionsPerDevicePerDay} email sign-ups per device per day (${LIMITS.subscriptionsPerNetworkPerDay} per shared network). Limits reset at midnight UTC.`,
  },
];

export default function PrinciplesPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">How it works</h1>
      <p className="mt-4 font-serif text-[20px] leading-8 text-ink-muted italic">
        Wishcode is where people post apps they wish existed, and developers build them. Here&apos;s how I run it.
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
