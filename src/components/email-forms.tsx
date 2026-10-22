"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { UnsubscribeResult, VerdictResult } from "@/app/actions";
import { ShareMoment } from "@/components/share-moment";
import { buttonStyles } from "@/components/ui";
import type { ShareMomentProps } from "@/lib/share-copy";

// The single POST button on each /e/* page. The pages bind the token and
// arguments into the Server Action, so these only submit and show the result.

export function EmailVerdictForm({
  action,
  works,
  wishHref,
  wisherShare,
}: {
  action: () => Promise<VerdictResult>;
  works: boolean;
  wishHref: string;
  /** Set when the wisher votes Yes: "Your wish came true" follows the thanks. */
  wisherShare?: ShareMomentProps;
}) {
  const [result, submit, pending] = useActionState<VerdictResult | null>(action, null);
  const [shareDone, setShareDone] = useState(false);

  if (result?.ok) {
    const state =
      result.verdict === "verified"
        ? "This link now shows as working."
        : result.verdict === "flagged"
          ? "This link now shows as not working."
          : "Once enough people vote, the link shows whether it works.";
    return (
      <>
        <Outcome title="Thanks, your vote counts." body={state} wishHref={wishHref} />
        {wisherShare && result.wisherVerdict === true && !shareDone && (
          <div className="card mt-6 p-6">
            <ShareMoment share={wisherShare} onDone={() => setShareDone(true)} />
          </div>
        )}
      </>
    );
  }
  if (result && !result.ok) {
    const body =
      result.code === "not_eligible"
        ? "Your vote can't be counted because you took back your me-too on this wish."
        : result.message;
    return <Outcome title="Your vote wasn't counted" body={body} wishHref={wishHref} />;
  }

  return (
    <form action={submit} className="mt-8">
      <button type="submit" disabled={pending} className={`${works ? buttonStyles.amber : buttonStyles.dark} px-6 py-3`}>
        {works ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
        {works ? "Yes, it works" : "No, it doesn't work"}
      </button>
    </form>
  );
}

export function UnsubscribeForm({
  action,
  all,
  wishHref,
}: {
  action: () => Promise<UnsubscribeResult>;
  all: boolean;
  wishHref: string | null;
}) {
  const [result, submit, pending] = useActionState<UnsubscribeResult | null>(action, null);

  if (result?.ok) {
    return (
      <Outcome
        title={result.all ? "You won't get any more Wishcode emails." : "You won't get more emails about this wish."}
        wishHref={wishHref}
      />
    );
  }
  return (
    <form action={submit} className="mt-8">
      {result && !result.ok && <p className="mb-4 text-label text-danger">{result.message}</p>}
      <button type="submit" disabled={pending} className={`${buttonStyles.dark} px-6 py-3`}>
        {all ? "Stop all Wishcode emails" : "Stop emails for this wish"}
      </button>
    </form>
  );
}

function Outcome({ title, body, wishHref }: { title: string; body?: string; wishHref: string | null }) {
  return (
    <div className="mt-8 rounded-xl bg-surface-low p-5" role="status">
      <p className="text-label font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 text-label text-ink-muted">{body}</p>}
      <Link href={wishHref ?? "/wishes"} className={`${buttonStyles.quiet} mt-4 bg-surface-container`}>
        {wishHref ? "See the wish" : "Back to all wishes"}
      </Link>
    </div>
  );
}
