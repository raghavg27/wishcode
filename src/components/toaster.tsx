"use client";

import clsx from "clsx";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useSyncExternalStore } from "react";

type Toast = { id: number; message: string; kind: "error" | "success" };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, kind: Toast["kind"] = "error") {
  const id = nextId++;
  toasts = [...toasts.filter((t) => t.message !== message), { id, message, kind }].slice(-3);
  emit();
  setTimeout(() => dismissToast(id), kind === "error" ? 6000 : 3500);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const empty: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => empty);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={clsx(
            "pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-label shadow-card-hover",
            t.kind === "error" ? "border-danger/20 bg-danger-soft text-[#93000a]" : "border-leaf-border bg-leaf-soft text-leaf-ink",
          )}
        >
          {t.kind === "error" ? (
            <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="mt-px size-4 shrink-0" aria-hidden />
          )}
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
