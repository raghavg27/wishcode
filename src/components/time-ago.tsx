"use client";

import { useSyncExternalStore } from "react";
import { formatDate, relativeTime } from "@/lib/format";

// One shared minute ticker for every timestamp on the page.
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  if (!now) now = Date.now();
  return now;
}

/**
 * Relative timestamp. The server (and hydration) render an absolute UTC date,
 * so cached HTML never goes stale or mismatches; the client then switches to
 * "3 days ago".
 */
export function TimeAgo({ iso, prefix, className }: { iso: string; prefix?: string; className?: string }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  const label = current ? relativeTime(iso, current) : formatDate(iso);
  return (
    <time dateTime={iso} title={formatDate(iso)} className={className}>
      {prefix ? `${prefix} ${label}` : label}
    </time>
  );
}
