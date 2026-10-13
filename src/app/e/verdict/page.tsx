import type { Metadata } from "next";
import { Suspense } from "react";
import { emailVerdict } from "@/app/actions";
import { EmailVerdictForm } from "@/components/email-forms";
import { EmailNotice, EmailShell, EmailSkeleton, InvalidEmailLink, LinkSummary, WishQuote } from "@/components/email-landing";
import { verifyEmailToken } from "@/lib/email-token";
import { getSubscriptionContext, getWish } from "@/lib/data";
import { env } from "@/lib/env";
import { parseWishId, wishPath } from "@/lib/site";

export const metadata: Metadata = {
  title: "Does it work?",
  robots: { index: false, follow: false },
};

// Opened from the Yes / No buttons in a "someone built it" email. Showing
// the page changes nothing; the vote is cast by the button's POST.
export default function EmailVerdictPage({ searchParams }: PageProps<"/e/verdict">) {
  return (
    <EmailShell>
      <Suspense fallback={<EmailSkeleton />}>
        <VerdictView searchParams={searchParams} />
      </Suspense>
    </EmailShell>
  );
}

async function VerdictView({ searchParams }: Pick<PageProps<"/e/verdict">, "searchParams">) {
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const linkId = typeof sp.link === "string" ? parseWishId(sp.link) : null;
  const works = sp.works === "1" ? true : sp.works === "0" ? false : null;

  const subscriptionId = verifyEmailToken(token, env.emailTokenSecret);
  if (!subscriptionId || !linkId || works === null) return <InvalidEmailLink />;
  const context = await getSubscriptionContext(subscriptionId);
  if (!context) return <InvalidEmailLink />;

  const wish = await getWish(context.wish_id);
  const href = wishPath(context.wish_id);
  if (!wish || wish.removed || !wish.text) {
    return <EmailNotice title="This wish was removed" body="A moderator removed it, so there's nothing to vote on." />;
  }
  const link = wish.links.find((l) => l.id === linkId);
  if (!link) {
    return <EmailNotice title="This link was removed" body="Its developer or a moderator took it down." href={href} cta="See the wish" />;
  }

  return (
    <>
      <p className="mb-4 text-label-sm font-semibold tracking-wider text-primary uppercase">Does it work?</p>
      <WishQuote text={wish.text} />
      <LinkSummary handle={link.developer.handle} description={link.description} url={link.url} />
      <p className="mt-6 text-[15px] leading-6 text-ink-muted">
        {works
          ? "Confirm that this app does what the wish asked for."
          : "Tell others this app doesn't do what the wish asked for."}{" "}
        You can change your vote on the wish page.
      </p>
      <EmailVerdictForm action={emailVerdict.bind(null, token, linkId, works)} works={works} wishHref={href} />
    </>
  );
}
