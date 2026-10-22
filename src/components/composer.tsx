"use client";

import clsx from "clsx";
import { ArrowRight, Clock, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { postWish, setMetoo } from "@/app/actions";
import { DuplicateModal } from "@/components/duplicate-modal";
import { primeMetoo } from "@/components/metoo";
import { toast } from "@/components/toaster";
import { useTurnstile } from "@/components/turnstile";
import { track } from "@/lib/analytics";
import { POST_WISH_ACTION, WISH_MAX, WISH_MIN } from "@/lib/config";
import { readDraft, writeDraft } from "@/lib/draft";
import { resetsIn } from "@/lib/format";
import { wishPath } from "@/lib/site";
import type { SimilarWish } from "@/lib/types";
import { charLength, normalizeWishText, wishTextIssue } from "@/lib/validation";

export function Composer() {
  const router = useRouter();
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<"post" | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the daily limit is hit; cleared automatically once it resets.
  const [limit, setLimit] = useState<{ resetAt: string; label: string } | null>(null);
  const [similar, setSimilar] = useState<SimilarWish[] | null>(null);
  const { ref: turnstileRef, getToken, reset: resetTurnstile } = useTurnstile(POST_WISH_ACTION);

  // Restore an unsent draft (e.g. after hitting the daily limit).
  useEffect(() => {
    const draft = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setText(draft);
  }, []);

  // "Post a wish" links point at #compose: focus the field when they're used.
  useEffect(() => {
    const focusIfTargeted = () => {
      if (window.location.hash === "#compose") textareaRef.current?.focus({ preventScroll: false });
    };
    focusIfTargeted();
    window.addEventListener("hashchange", focusIfTargeted);
    return () => window.removeEventListener("hashchange", focusIfTargeted);
  }, []);

  const normalized = normalizeWishText(text);
  const length = charLength(normalized);
  const issue = wishTextIssue(normalized);
  const showIssue = touched && length > 0 && issue;
  const limited = limit !== null;

  useEffect(() => {
    if (!limit) return;
    const ms = new Date(limit.resetAt).getTime() - Date.now();
    const timer = setTimeout(() => {
      setLimit(null);
      setError(null);
    }, Math.max(0, Math.min(ms, 2 ** 31 - 1)));
    return () => clearTimeout(timer);
  }, [limit]);

  async function submit(force: boolean) {
    if (issue || busy !== null || limited) return;
    setBusy("post");
    setError(null);
    try {
      const turnstileToken = await getToken();
      const result = await postWish({ text: normalized, force, turnstileToken });
      // "similar" leaves the token unchecked for "Post mine anyway".
      if (result.ok !== "similar") resetTurnstile();
      if (result.ok === true) {
        writeDraft("");
        setText("");
        setSimilar(null);
        track("wish_posted", { forced: force });
        router.push(`${wishPath(result.id)}?posted=1`);
        return;
      }
      if (result.ok === "similar") {
        track("duplicate_shown", { count: result.similar.length });
        setSimilar(result.similar);
        setBusy(null);
        return;
      }
      setSimilar(null);
      setError(result.message);
      if (result.code === "rate_limited" && result.resetAt && new Date(result.resetAt).getTime() > Date.now()) {
        setLimit({ resetAt: result.resetAt, label: resetsIn(result.resetAt, Date.now()) });
      }
    } catch {
      setError("Couldn't reach Wishcode. Check your connection and try again.");
    }
    setBusy(null);
  }

  async function metooInstead(wish: SimilarWish) {
    setBusy(wish.id);
    try {
      const result = await setMetoo(wish.id, true);
      if (result.ok) {
        primeMetoo(wish.id, result.metooCount);
        track("duplicate_metoo", { wish_id: wish.id });
        writeDraft("");
        setText("");
        setSimilar(null);
        router.push(wishPath(wish.id));
        return;
      }
      toast(result.message);
    } catch {
      toast("Couldn't reach Wishcode. Check your connection and try again.");
    }
    setBusy(null);
  }

  return (
    <section id="compose" className="card mb-8 scroll-mt-24 p-4 transition-shadow focus-within:shadow-card-hover sm:p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          submit(false);
        }}
      >
        <label htmlFor={id} className="sr-only">
          Your wish
        </label>
        <textarea
          id={id}
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            writeDraft(e.target.value);
            if (error && !limited) setError(null);
          }}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              setTouched(true);
              submit(false);
            }
          }}
          rows={2}
          maxLength={WISH_MAX + 40}
          placeholder="I wish there was an app that…"
          aria-invalid={Boolean(showIssue) || undefined}
          aria-describedby={`${id}-hint`}
          className="field-sizing-content max-h-72 min-h-[4.5rem] w-full resize-none bg-transparent font-serif text-wish-sm text-ink placeholder:text-outline-variant focus:outline-none sm:text-wish"
        />

        <div id={`${id}-hint`} aria-live="polite">
          {showIssue && (
            <p className="mt-1 flex items-center gap-1.5 text-label text-danger">
              <CircleAlert className="size-4" aria-hidden />
              {issue === "too_short" ? `A bit more detail, at least ${WISH_MIN} characters.` : `Keep it under ${WISH_MAX} characters.`}
            </p>
          )}
          {error && (
            <div
              className={clsx(
                "mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-label",
                limited ? "bg-surface-container text-ink" : "bg-danger-soft text-[#93000a]",
              )}
            >
              {limited ? <Clock className="mt-px size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />}
              <span>
                <span className="font-medium">{error}</span>
                {limit && (
                  <span className="block text-label-sm text-ink-muted">
                    Your draft is saved on this device. Resets in {limit.label}.
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Cloudflare's bot check; empty unless it needs the visitor to click. */}
        <div ref={turnstileRef} className="mt-2 empty:hidden" />

        <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-label text-ink-muted">
            <span className="hidden size-2 rounded-full bg-amber sm:inline-block" aria-hidden />
            <ShieldCheck className="size-4 sm:hidden" aria-hidden />
            No account. No email. Just your wish.
          </p>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span
              className={clsx("text-label tabular", length > WISH_MAX ? "text-danger" : "text-outline")}
              aria-label={`${length} of ${WISH_MAX} characters`}
            >
              {length}
              <span className="text-outline-variant">/{WISH_MAX}</span>
              <span className="ml-1 text-caption text-ink-muted">(min {WISH_MIN})</span>
            </span>
            <button
              type="submit"
              disabled={Boolean(issue) || busy !== null || limited}
              className="inline-flex items-center gap-1 rounded-lg bg-amber px-5 py-2 text-label font-semibold text-on-amber shadow-sm transition-all hover:bg-amber-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "post" && !similar ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Post
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </form>

      <DuplicateModal
        open={similar !== null}
        typed={normalized}
        similar={similar ?? []}
        busy={busy}
        onClose={() => {
          setSimilar(null);
          setBusy(null);
          textareaRef.current?.focus();
        }}
        onMetoo={metooInstead}
        onPostAnyway={() => submit(true)}
      />
    </section>
  );
}
