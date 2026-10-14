"use client";

import clsx from "clsx";
import { CircleHelp, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { setVerdict } from "@/app/actions";
import { useMetoo } from "@/components/metoo";
import { ShareMomentModal } from "@/components/share-moment";
import { toast } from "@/components/toaster";
import { track } from "@/lib/analytics";
import type { ShareMomentProps } from "@/lib/share-copy";
import type { LinkVerdict } from "@/lib/types";
import { computeVerdict, verdictCountsText } from "@/lib/verdict";

type VerdictState = {
  verdict: LinkVerdict;
  worksCount: number;
  brokenCount: number;
  wisherVerdict: boolean | null;
  /** This viewer's vote. */
  mine: boolean | null;
};

type Props = VerdictState & {
  wishId: number;
  linkId: number;
  isWisher: boolean;
  /** Seeds the shared me-too state: me-too'ing on this page makes you eligible. */
  metoo: { active: boolean; count: number };
  /** For the wisher: "Your wish came true", shown when they vote Yes. */
  wisherShare?: ShareMomentProps;
};

/** A link's verdict chip, plus Yes / No voting for the wisher and me-too-ers. */
export function LinkVerdictPanel({ wishId, linkId, isWisher, metoo, wisherShare, ...initial }: Props) {
  const { active } = useMetoo(wishId, metoo);
  const eligible = isWisher || active;
  const [local, setLocal] = useState<VerdictState | null>(null);
  const [pending, startTransition] = useTransition();
  const [wasActive, setWasActive] = useState(active);
  const [sharing, setSharing] = useState(false);
  const state = local ?? initial;

  // Taking back a me-too deletes this viewer's votes on the server.
  if (active !== wasActive) {
    setWasActive(active);
    if (!active && !isWisher && state.mine !== null) {
      const worksCount = state.worksCount - (state.mine ? 1 : 0);
      const brokenCount = state.brokenCount - (state.mine ? 0 : 1);
      setLocal({
        ...state,
        worksCount,
        brokenCount,
        mine: null,
        verdict: computeVerdict(state.wisherVerdict, worksCount, brokenCount),
      });
    }
  }

  function vote(works: boolean | null) {
    startTransition(async () => {
      try {
        const result = await setVerdict(linkId, works);
        if (result.ok) {
          setLocal({
            verdict: result.verdict,
            worksCount: result.worksCount,
            brokenCount: result.brokenCount,
            wisherVerdict: result.wisherVerdict,
            mine: result.works,
          });
          if (works !== null) track("verdict", { wish_id: wishId, link_id: linkId, works });
          if (works === true && isWisher && result.wisherVerdict === true && wisherShare) setSharing(true);
        } else {
          toast(result.message);
        }
      } catch {
        toast("Couldn't reach Wishcode. Check your connection and try again.");
      }
    });
  }

  const counts = verdictCountsText(state.worksCount, state.brokenCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-hairline px-5 py-3">
      <VerdictChip {...state} />
      {eligible ? (
        <div role="group" aria-label="Did it work for you?" className="flex items-center gap-2">
          <span className="text-label-sm text-ink-muted">Did it work for you?</span>
          <VoteButton pressed={state.mine === true} busy={pending} onClick={() => vote(state.mine === true ? null : true)}>
            <ThumbsUp className="size-3.5" aria-hidden /> Yes
          </VoteButton>
          <VoteButton pressed={state.mine === false} busy={pending} onClick={() => vote(state.mine === false ? null : false)}>
            <ThumbsDown className="size-3.5" aria-hidden /> No
          </VoteButton>
        </div>
      ) : (
        counts && <span className="text-label-sm text-ink-muted">{counts}</span>
      )}
      {wisherShare && <ShareMomentModal share={wisherShare} open={sharing} onClose={() => setSharing(false)} />}
    </div>
  );
}

function VerdictChip({ verdict, worksCount, brokenCount, wisherVerdict }: VerdictState) {
  const chip = "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-label-sm font-semibold whitespace-nowrap";
  if (verdict === "verified") {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={clsx(chip, "border-leaf-border bg-leaf-chip/60 text-leaf-ink")}>
          Works ✓
        </span>
        <span className="text-label-sm text-ink-muted">
          {wisherVerdict ? "confirmed by the wisher" : `confirmed by ${worksCount} people`}
        </span>
      </span>
    );
  }
  if (verdict === "flagged") {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={clsx(chip, "border-danger/30 bg-danger-soft/60 text-danger")}>
          <TriangleAlert className="size-3.5" aria-hidden /> Doesn&apos;t work
        </span>
        <span className="text-label-sm text-ink-muted">
          {wisherVerdict === false ? "flagged by the wisher" : `flagged by ${brokenCount} people`}
        </span>
      </span>
    );
  }
  return (
    <span className={clsx(chip, "border-stone-border bg-stone-soft text-ink-muted")}>
      <CircleHelp className="size-3.5" aria-hidden /> Unverified
    </span>
  );
}

function VoteButton({
  pressed,
  busy,
  onClick,
  children,
}: {
  pressed: boolean;
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={pressed}
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-label-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60",
        pressed ? "border-ink bg-ink text-white" : "border-hairline bg-surface-lowest text-ink hover:border-outline-variant",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Flagged links start collapsed behind a muted row. Wraps every link, flagged
 * or not, so a vote that changes the verdict doesn't remount the card (and
 * close a share moment it just opened).
 */
export function FlaggedLink({ handle, flagged, children }: { handle: string; flagged: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open || !flagged) return <>{children}</>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-low px-5 py-3.5">
      <p className="flex items-center gap-2 text-label text-ink-muted">
        <TriangleAlert className="size-4 shrink-0 text-outline" aria-hidden />
        <span>
          People say this doesn&apos;t work <span className="text-outline">· @{handle}</span>
        </span>
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-label-sm font-medium text-ink underline decoration-dotted underline-offset-4 hover:decoration-solid"
      >
        Show anyway
      </button>
    </div>
  );
}
