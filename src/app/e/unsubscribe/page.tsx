import type { Metadata } from "next";
import { Suspense } from "react";
import { allowEmails, stopDeveloperEmails, unsubscribe, type AllowEmailsResult } from "@/app/actions";
import { AllowEmailsForm, UnsubscribeForm } from "@/components/email-forms";
import { EmailNotice, EmailShell, EmailSkeleton, InvalidEmailLink, WishQuote } from "@/components/email-landing";
import { verifyEmailToken, verifyLinkToken } from "@/lib/email-token";
import { getDeveloperEmailContext, getSubscriptionContext, getWish } from "@/lib/data";
import { env } from "@/lib/env";
import { wishPath } from "@/lib/site";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

// Opened from an email footer. Showing the page changes nothing; the button
// unsubscribes. Mail clients' one-click POSTs go to /api/unsubscribe.
// Subscriber emails carry ?t= (a subscription); developer emails carry ?d=
// (a link), and their only option is stopping all Wishcode email.
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
  if (typeof sp.d === "string") return <DeveloperStopView token={sp.d} />;
  const token = typeof sp.t === "string" ? sp.t : "";
  const all = sp.all === "1";

  const subscriptionId = verifyEmailToken(token, env.emailTokenSecret);
  if (!subscriptionId) return <InvalidEmailLink />;
  const context = await getSubscriptionContext(subscriptionId);
  if (!context) return <InvalidEmailLink />;

  const href = wishPath(context.wish_id);
  if (context.suppressed) return <EmailsOff action={allowEmails.bind(null, token, false)} wishHref={href} />;
  if (!all && context.unsubscribed) {
    return <EmailNotice title="Emails for this wish are already off" body="Nothing else to do here." href={href} cta="See the wish" />;
  }

  const wish = all ? null : await getWish(context.wish_id);
  return (
    <>
      <h1 className="font-serif text-display-sm text-ink">{all ? "Stop all Wishcode emails?" : "Stop emails for this wish?"}</h1>
      <p className="mt-3 mb-6 text-[15px] leading-6 text-ink-muted">
        {all
          ? "You will not get emails about any wish, including ones you sign up for later."
          : "You will not hear when someone posts another link for it."}
      </p>
      {wish?.text && !wish.removed && <WishQuote text={wish.text} />}
      <UnsubscribeForm action={unsubscribe.bind(null, token, all)} all={all} wishHref={href} />
    </>
  );
}

// The address stopped all Wishcode email. The token proves that the visitor
// owns the inbox, so this page is the one place that can turn email on again.
function EmailsOff({ action, wishHref }: { action: () => Promise<AllowEmailsResult>; wishHref: string }) {
  return (
    <>
      <h1 className="font-serif text-display-sm text-ink">Wishcode emails are off</h1>
      <p className="mt-3 text-[15px] leading-6 text-ink-muted">
        You do not get emails about any wish. You can turn Wishcode emails on again.
      </p>
      <AllowEmailsForm action={action} wishHref={wishHref} />
    </>
  );
}

async function DeveloperStopView({ token }: { token: string }) {
  const linkId = verifyLinkToken(token, env.emailTokenSecret);
  if (!linkId) return <InvalidEmailLink />;
  const context = await getDeveloperEmailContext(linkId);
  if (!context) return <InvalidEmailLink />;

  const href = wishPath(context.wish_id);
  if (context.suppressed) return <EmailsOff action={allowEmails.bind(null, token, true)} wishHref={href} />;
  return (
    <>
      <h1 className="font-serif text-display-sm text-ink">Stop all Wishcode emails?</h1>
      <p className="mt-3 mb-6 text-[15px] leading-6 text-ink-muted">
        You will not hear when your builds are confirmed, or about any wish you sign up for.
      </p>
      <UnsubscribeForm action={stopDeveloperEmails.bind(null, token)} all wishHref={href} />
    </>
  );
}
