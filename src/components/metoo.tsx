"use client";

import clsx from "clsx";
import { Hand } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { setMetoo } from "@/app/actions";
import { toast } from "@/components/toaster";
import { track } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";

// Optimistic me-too state shared by every button for the same wish (card,
// hero and mobile bar), seeded from server props until the viewer taps.

type MetooState = { active: boolean; count: number; pending?: boolean };

const overrides = new Map<number, MetooState>();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function write(id: number, state: MetooState) {
  overrides.set(id, state);
  listeners.forEach((l) => l());
}

export function useMetoo(wishId: number, initial: { active: boolean; count: number }) {
  const override = useSyncExternalStore(
    subscribe,
    () => overrides.get(wishId),
    () => undefined,
  );
  const state: MetooState = override ?? initial;

  const toggle = useCallback(async () => {
    const current: MetooState = overrides.get(wishId) ?? initial;
    if (current.pending) return;
    const active = !current.active;
    write(wishId, { active, count: Math.max(0, current.count + (active ? 1 : -1)), pending: true });
    try {
      const result = await setMetoo(wishId, active);
      if (result.ok) {
        write(wishId, { active: result.active, count: result.metooCount });
        if (active) track("metoo", { wish_id: wishId });
      } else {
        write(wishId, { active: current.active, count: current.count });
        toast(result.message);
      }
    } catch {
      write(wishId, { active: current.active, count: current.count });
      toast("Couldn't reach Wishcode. Check your connection and try again.");
    }
  }, [wishId, initial]);

  return { ...state, toggle };
}

/** Marks a wish as me-too'd locally, e.g. after "Me too on this one". */
export function primeMetoo(wishId: number, count: number) {
  write(wishId, { active: true, count });
}

type Props = {
  wishId: number;
  active: boolean;
  count: number;
  variant?: "pill" | "hero" | "bar";
  disabled?: boolean;
  className?: string;
};

/** One tap of the button. Animations key off this, never off count changes. */
type Tap = { n: number; dir: "up" | "down"; from: number };

export function MetooButton({ wishId, active: initialActive, count: initialCount, variant = "pill", disabled, className }: Props) {
  const { active, count, pending, toggle } = useMetoo(wishId, { active: initialActive, count: initialCount });
  const [tap, setTap] = useState<Tap | null>(null);

  function onClick() {
    if (pending) return;
    setTap((t) => ({ n: (t?.n ?? 0) + 1, dir: active ? "down" : "up", from: count }));
    void toggle();
  }

  const common = clsx(
    "group/metoo relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
    tap && (tap.n % 2 ? "motion-safe:animate-squish-a" : "motion-safe:animate-squish-b"),
    className,
  );
  const label = active ? "Remove your me-too" : "Me too";
  const plusOne = tap?.dir === "up" && (
    <span
      key={tap.n}
      className="pointer-events-none absolute -top-3 right-2 text-label-sm font-bold text-primary animate-float-up motion-reduce:hidden"
      aria-hidden
    >
      +1
    </span>
  );

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        aria-busy={pending}
        className={clsx(
          common,
          "min-h-12 border-[1.5px] border-amber px-5 py-2.5 text-[15px]",
          active ? "bg-amber text-on-amber" : "bg-amber/90 text-on-amber hover:bg-amber",
        )}
      >
        <WaveHand tap={tap} className="size-5" />
        <span className="tabular">
          <RollingCount value={count} tap={tap} /> {count === 1 ? "me-too" : "me-toos"}
        </span>
        <span className="text-label font-medium opacity-70" aria-hidden>
          ·
        </span>
        <span className="text-label font-medium">{active ? "You too ✓" : "Me too +1"}</span>
        {plusOne}
      </button>
    );
  }

  if (variant === "bar") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        aria-label={label}
        className={clsx(
          common,
          "h-11 flex-1 rounded-xl border-[1.5px] text-label",
          active ? "border-amber bg-amber text-on-amber" : "border-hairline bg-surface-lowest text-ink",
        )}
      >
        <WaveHand tap={tap} className="size-[18px]" />
        <span className="tabular">
          <RollingCount value={count} tap={tap} />
        </span>{" "}
        Me too
        {plusOne}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`${label} (${formatNumber(count)})`}
      className={clsx(
        common,
        "min-h-10 border-[1.5px] px-3.5 py-1.5 text-label",
        active
          ? "border-amber bg-amber text-on-amber"
          : "border-transparent bg-surface-container text-ink hover:border-amber/60 hover:bg-amber/15",
      )}
    >
      <WaveHand
        tap={tap}
        className={clsx("size-[18px] transition-transform group-hover/metoo:-translate-y-0.5", active ? "" : "text-primary")}
      />
      <span>Me too</span>
      <span className="opacity-50" aria-hidden>
        ·
      </span>
      <span className="tabular">
        <RollingCount value={count} tap={tap} />
      </span>
      {plusOne}
    </button>
  );
}

/** The hand waves on a me-too (not on undo). Remounting restarts the wave. */
function WaveHand({ tap, className }: { tap: Tap | null; className?: string }) {
  const waving = tap?.dir === "up";
  return (
    <span key={waving ? tap.n : 0} className={clsx("inline-flex origin-bottom", waving && "motion-safe:animate-wave")}>
      <Hand className={className} aria-hidden />
    </span>
  );
}

/**
 * The old number slides out and the new one slides in: up on a me-too, down
 * on undo. Visual only; screen readers get the plain number once.
 */
function RollingCount({ value, tap }: { value: number; tap: Tap | null }) {
  const text = formatNumber(value);
  const up = tap?.dir === "up";
  return (
    <>
      <span className="relative inline-block overflow-hidden align-top" aria-hidden>
        {tap && (
          <span
            key={`out-${tap.n}`}
            className={clsx("absolute inset-0 motion-reduce:hidden", up ? "animate-roll-out-up" : "animate-roll-out-down")}
          >
            {formatNumber(tap.from)}
          </span>
        )}
        <span
          key={`in-${tap?.n ?? 0}`}
          className={clsx("block", tap && (up ? "motion-safe:animate-roll-in-up" : "motion-safe:animate-roll-in-down"))}
        >
          {text}
        </span>
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
