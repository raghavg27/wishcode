"use client";

import { Mail, MailCheck } from "lucide-react";
import { useCallback, useEffect, useId, useState, useSyncExternalStore, useTransition } from "react";
import { subscribe } from "@/app/actions";
import { useMetoo } from "@/components/metoo";
import { buttonStyles } from "@/components/ui";
import { track } from "@/lib/analytics";
import { EMAIL_MAX } from "@/lib/config";
import { emailIssue, normalizeEmail } from "@/lib/validation";

// "Email me when it's built": the wisher's opt-in after posting and the
// me-too-er's inline link share one subscribed state per wish. The server
// only ever says subscribed or not; the address stays in this browser's
// localStorage (to pre-fill the field) and the subscribe action.

const subscribed = new Map<number, boolean>();
const listeners = new Set<() => void>();
const listen = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function setSubscribed(wishId: number, value: boolean) {
  subscribed.set(wishId, value);
  listeners.forEach((l) => l());
}
function useSubscribed(wishId: number, initial: boolean) {
  return useSyncExternalStore(
    listen,
    () => subscribed.get(wishId) ?? initial,
    () => initial,
  );
}

const EMAIL_KEY = "wc:email";

function storedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Private mode or blocked storage: the field just won't pre-fill.
  }
}

type Props = {
  wishId: number;
  isWisher: boolean;
  /** Whether this browser is subscribed, from viewer_wish_state. */
  subscribed: boolean;
  metoo: { active: boolean; count: number };
};

const SUBSCRIBED_TEXT = "We'll email you when someone builds this.";

/** Under the me-too control: a small link that expands into the email field. */
export function EmailOptIn({ wishId, isWisher, subscribed: initial, metoo, className }: Props & { className?: string }) {
  const { active } = useMetoo(wishId, metoo);
  const eligible = isWisher || active;
  const isSubscribed = useSubscribed(wishId, initial);
  const [open, setOpen] = useState(false);

  // Taking back a me-too ends a me-too-er's subscription on the server.
  useEffect(() => {
    if (!eligible) setSubscribed(wishId, false);
  }, [eligible, wishId]);

  if (!eligible) return null;
  if (isSubscribed) {
    return (
      <p className={`flex items-center gap-1.5 text-label-sm text-ink-muted ${className ?? ""}`} role="status">
        <MailCheck className="size-3.5 text-leaf" aria-hidden /> {SUBSCRIBED_TEXT}
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-label-sm font-medium text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid ${className ?? ""}`}
      >
        <Mail className="size-3.5" aria-hidden /> Email me when it&apos;s built
      </button>
    );
  }
  return (
    <div className={className}>
      <EmailForm wishId={wishId} autoFocus />
    </div>
  );
}

/** The wisher's opt-in in the posted moment (/w/:id?posted=1). */
export function WisherOptIn({ wishId, subscribed: initial }: { wishId: number; subscribed: boolean }) {
  const isSubscribed = useSubscribed(wishId, initial);
  const id = useId();

  if (isSubscribed) {
    return (
      <p className="flex items-center gap-2 text-label font-medium text-ink" role="status">
        <MailCheck className="size-4 text-leaf" aria-hidden /> {SUBSCRIBED_TEXT}
      </p>
    );
  }
  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="flex items-center gap-2 text-label font-semibold text-ink">
        <Mail className="size-4 text-primary" aria-hidden /> Want to know when someone builds this?
      </h3>
      <p className="mt-1 mb-3 text-label-sm text-ink-muted">
        We&apos;ll email you when a developer posts a live link. Optional, and every email has an unsubscribe link.
      </p>
      <EmailForm wishId={wishId} />
    </section>
  );
}

function EmailForm({ wishId, autoFocus }: { wishId: number; autoFocus?: boolean }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Pre-fill once on mount; never overwrite what the viewer typed.
  const prefill = useCallback((el: HTMLInputElement | null) => {
    if (el && !el.value) el.value = storedEmail();
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = normalizeEmail(String(new FormData(e.currentTarget).get("email") ?? ""));
    if (emailIssue(email)) {
      setError("That email address doesn't look right.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await subscribe(wishId, email);
        if (result.ok) {
          rememberEmail(email);
          setSubscribed(wishId, true);
          track("email_opt_in", { wish_id: wishId });
        } else {
          setError(result.message);
        }
      } catch {
        setError("Couldn't reach Wishcode. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          ref={prefill}
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={EMAIL_MAX}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${id}-error`}
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface-lowest px-3 py-2 text-[15px] text-ink placeholder:text-stone focus:outline-2 focus:outline-offset-0 focus:outline-amber"
        />
        <button type="submit" disabled={pending} className={buttonStyles.amber}>
          {pending ? "Saving…" : "Notify me"}
        </button>
      </div>
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-label-sm text-danger empty:hidden">
        {error}
      </p>
    </form>
  );
}
