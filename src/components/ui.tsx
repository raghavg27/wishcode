import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { CircleCheck, Info, ShieldCheck } from "lucide-react";
import { DISCLAIMER } from "@/lib/config";
import { developerPath } from "@/lib/site";
import type { DeveloperRef, WishStatus } from "@/lib/types";

export const buttonStyles = {
  amber:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-label font-semibold text-on-amber shadow-[0_1px_2px_rgba(20,17,15,0.08)] transition-colors hover:bg-amber-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  dark: "inline-flex items-center justify-center gap-2 rounded-lg bg-inverse px-4 py-2.5 text-label font-medium text-inverse-ink transition-colors hover:bg-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  quiet:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-low px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-label font-medium text-ink-muted transition-colors hover:bg-surface-low hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
} as const;

const STATUS_META: Record<WishStatus | "removed", { label: string; className: string }> = {
  open: { label: "Open", className: "border-ink/15 bg-surface-container text-ink" },
  being_built: { label: "Being built", className: "border-craft-border bg-craft-chip text-craft-ink" },
  fulfilled: { label: "Fulfilled", className: "border-leaf-border bg-leaf-chip/60 text-leaf-ink" },
  removed: { label: "Removed", className: "border-stone-border bg-stone-soft text-stone" },
};

export function statusLabel(status: WishStatus) {
  return STATUS_META[status].label;
}

export function StatusChip({
  status,
  removed,
  className,
}: {
  status: WishStatus;
  removed?: boolean;
  className?: string;
}) {
  const key = removed ? "removed" : status;
  const meta = STATUS_META[key];
  return (
    <span
      className={clsx(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-label-sm font-semibold whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {key === "fulfilled" && <CircleCheck className="size-3.5" aria-hidden />}
      {key === "being_built" && <span className="size-1.5 animate-pulse rounded-full bg-craft" aria-hidden />}
      {meta.label}
    </span>
  );
}

function initials(handle: string) {
  return handle.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
}

export function Avatar({ dev, size = 24, className }: { dev: DeveloperRef; size?: number; className?: string }) {
  const base = clsx("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className);
  if (dev.avatar_url) {
    const src = new URL(dev.avatar_url);
    src.searchParams.set("s", String(size * 2));
    return (
      <Image
        src={src.toString()}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={clsx(base, "bg-surface-container object-cover")}
      />
    );
  }
  return (
    <span
      className={clsx(base, "bg-amber-soft font-semibold text-[#2a1800]")}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
      aria-hidden
    >
      {initials(dev.handle)}
    </span>
  );
}

export function DevChip({ dev, className }: { dev: DeveloperRef; className?: string }) {
  return (
    <Link
      href={developerPath(dev.handle)}
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-hairline bg-surface-low py-0.5 pr-2.5 pl-0.5 text-label-sm font-medium text-ink transition-colors hover:border-outline-variant",
        className,
      )}
    >
      <Avatar dev={dev} size={22} />@{dev.handle}
    </Link>
  );
}

export function Disclaimer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p
      className={clsx(
        "flex items-start gap-2 rounded-lg bg-surface-low px-3 py-2 text-label-sm text-ink-muted",
        className,
      )}
    >
      <Info className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children ?? DISCLAIMER}</span>
    </p>
  );
}

export function LedgerNote({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-start gap-3 rounded-xl bg-surface-low p-4 text-label-sm text-outline", className)}>
      <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        Wishcode is a crowd-sourced public wish ledger. Anyone can post ideas or link implementations. {DISCLAIMER}
      </p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-surface-container", className)} aria-hidden />;
}
