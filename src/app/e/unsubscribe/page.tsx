import type { Metadata } from "next";
import { Suspense } from "react";
import { unsubscribe } from "@/app/actions";
import { UnsubscribeForm } from "@/components/email-forms";
import { EmailNotice, EmailShell, EmailSkeleton, InvalidEmailLink, WishQuote } from "@/components/email-landing";
import { verifyEmailToken } from "@/lib/email-token";
import { getSubscriptionContext, getWish } from "@/lib/data";
import { env } from "@/lib/env";
import { wishPath } from "@/lib/site";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

// Opened from an email footer. Showing the page changes nothing; the button
// unsubscribes. Mail clients' one-click POSTs go to /api/unsubscribe.
export default function UnsubscribePage({ searchParams }: PageProps<"/e/unsubscribe">) {
  return (
    <EmailShell>
      <Suspense fallback={<EmailSkeleton />}>
        <UnsubscribeView searchParams={searchParams} />
      </Suspense>
    </EmailShell>
  );
}

async function UnsubscribeView({ searchParams }: Pick<PageProps<"/e/unsubscribe">, "searchParams">) {
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const all = sp.all === "1";

  const subscriptionId = verifyEmailToken(token, env.emailTokenSecret);
  if (!subscriptionId) return <InvalidEmailLink />;
  const context = await getSubscriptionContext(subscriptionId);
  if (!context) return <InvalidEmailLink />;

  const href = wishPath(context.wish_id);
  if (all ? context.suppressed : context.unsubscribed || context.suppressed) {
    return (
      <EmailNotice
        title={context.suppressed ? "Wishcode emails are already off" : "Emails for this wish are already off"}
        body="Nothing else to do here."
        href={href}
        cta="See the wish"
      />
    );
  }

  const wish = all ? null : await getWish(context.wish_id);
  return (
    <>
      <h1 className="font-serif text-display-sm text-ink">{all ? "Stop all Wishcode emails?" : "Stop emails for this wish?"}</h1>
      <p className="mt-3 mb-6 text-[15px] leading-6 text-ink-muted">
        {all
          ? "You won't get emails about any wish, including ones you subscribe to later."
          : "You won't hear when someone posts another link for it."}
      </p>
      {wish?.text && !wish.removed && <WishQuote text={wish.text} />}
      <UnsubscribeForm action={unsubscribe.bind(null, token, all)} all={all} wishHref={href} />
    </>
  );
}
