"use client";

import clsx from "clsx";
import { Hand } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
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

export function MetooButton({ wishId, active: initialActive, count: initialCount, variant = "pill", disabled, className }: Props) {
  const { active, count, pending, toggle } = useMetoo(wishId, { active: initialActive, count: initialCount });

  const common = clsx(
    "group/metoo inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
    active && "animate-pop",
    className,
  );
  const label = active ? "Remove your me-too" : "Me too";

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={active}
        aria-busy={pending}
        className={clsx(
          common,
          "min-h-12 border-[1.5px] border-amber px-5 py-2.5 text-[15px]",
          active ? "bg-amber text-on-amber" : "bg-amber/90 text-on-amber hover:bg-amber",
        )}
      >
        <Hand className="size-5" aria-hidden />
        <span className="tabular">
          {formatNumber(count)} {count === 1 ? "person" : "people"} wished this
        </span>
        <span className="text-label font-medium opacity-70" aria-hidden>
          ·
        </span>
        <span className="text-label font-medium">{active ? "You too ✓" : "Me too +1"}</span>
      </button>
    );
  }

  if (variant === "bar") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={active}
        aria-label={label}
        className={clsx(
          common,
          "h-11 flex-1 rounded-xl border-[1.5px] text-label",
          active ? "border-amber bg-amber text-on-amber" : "border-hairline bg-surface-lowest text-ink",
        )}
      >
        <Hand className="size-[18px]" aria-hidden />
        <span className="tabular">{formatNumber(count)}</span> Me too
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
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
      <Hand
        className={clsx("size-[18px] transition-transform group-hover/metoo:-translate-y-0.5", active ? "" : "text-primary")}
        aria-hidden
      />
      <span>Me too</span>
      <span className="opacity-50" aria-hidden>
        ·
      </span>
      <span className="tabular">{formatNumber(count)}</span>
    </button>
  );
}
