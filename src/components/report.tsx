"use client";

import clsx from "clsx";
import { CircleAlert, Flag, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { moderate, report } from "@/app/actions";
import { Modal } from "@/components/modal";
import { toast } from "@/components/toaster";
import { buttonStyles } from "@/components/ui";
import { REPORT_REASONS, reportReasonsFor, type ReportReason } from "@/lib/reports";

/** "Report" for a wish, or one of its links (linkId). Opens the reason form. */
export function ReportButton({
  wishId,
  linkId = null,
  className,
  children,
}: {
  wishId: number;
  linkId?: number | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const id = useId();
  const target = linkId === null ? "wish" : "link";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setReason(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await report(wishId, linkId, reason);
      if (result.ok) {
        close();
        toast("Thanks for reporting. I will take a look.", "success");
      } else setError(result.message);
    } catch {
      setError("Could not reach Wishcode. Check your internet and try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx("inline-flex items-center gap-1.5 text-label-sm text-ink-muted hover:text-ink", className)}
      >
        {children ?? (
          <>
            <Flag className="size-3.5" aria-hidden /> Report
          </>
        )}
      </button>
      <Modal open={open} onClose={close} labelledBy={`${id}-title`} className="max-w-md">
        <form onSubmit={submit}>
          <h2 id={`${id}-title`} className="pr-8 font-serif text-[22px] leading-8 font-medium text-ink">
            {target === "wish" ? "Report this wish" : "Report this link"}
          </h2>
          <p className="mt-1 text-label text-ink-muted">
            {target === "wish"
              ? "Reports are anonymous. I review every one and remove what breaks the rules."
              : "Reports are anonymous. If the app just does not work, the people who wanted it can vote on that instead."}
          </p>
          <fieldset className="mt-5 space-y-2">
            <legend className="sr-only">Reason</legend>
            {reportReasonsFor(target).map((r) => (
              <label
                key={r}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-label text-ink transition-colors",
                  reason === r ? "border-amber bg-amber-soft/40" : "border-hairline hover:bg-surface-low",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-reason`}
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-amber"
                />
                {REPORT_REASONS[r]}
              </label>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-label text-[#93000a]">
              <CircleAlert className="mt-px size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={close} className={buttonStyles.ghost}>
              Cancel
            </button>
            <button type="submit" disabled={!reason || busy} className={buttonStyles.dark}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Flag className="size-4" aria-hidden />}
              Send report
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * Admin controls for a wish or one of its links: remove it, or (with
 * dismissible) clear its reports and keep it. Removing asks to confirm.
 */
export function ModerationActions({
  wishId,
  linkId = null,
  dismissible = false,
  className,
}: {
  wishId: number;
  linkId?: number | null;
  dismissible?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"remove" | "dismiss" | null>(null);
  const [pending, startTransition] = useTransition();
  const noun = linkId === null ? "wish" : "link";

  async function run(remove: boolean) {
    setBusy(remove ? "remove" : "dismiss");
    try {
      const result = await moderate(wishId, linkId, remove);
      if (result.ok) {
        toast(remove ? `The ${noun} was removed.` : "Reports dismissed.", "success");
        startTransition(() => router.refresh());
      } else toast(result.message);
    } catch {
      toast("Could not reach Wishcode. Check your internet and try again.");
    }
    setBusy(null);
    setConfirming(false);
  }

  const working = busy !== null || pending;

  return (
    <div className={clsx("flex flex-wrap items-center gap-2", className)}>
      {confirming ? (
        <>
          <span className="text-label text-ink-muted">Remove this {noun} for everyone?</span>
          <button
            type="button"
            onClick={() => run(true)}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-label font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === "remove" && <Loader2 className="size-4 animate-spin" aria-hidden />} Yes, remove
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={working} className={buttonStyles.ghost}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-label font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden /> Remove {noun}
          </button>
          {dismissible && (
            <button type="button" onClick={() => run(false)} disabled={working} className={buttonStyles.quiet}>
              {busy === "dismiss" && <Loader2 className="size-4 animate-spin" aria-hidden />} Dismiss reports
            </button>
          )}
        </>
      )}
    </div>
  );
}
