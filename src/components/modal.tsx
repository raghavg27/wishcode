"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Accessible modal on the native <dialog> (focus trap, Esc, inert page). */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // Next.js keeps previous routes mounted inside a hidden <Activity>, which
    // runs effect cleanups. A modal left open there would make the new page
    // inert, so close it whenever this effect is torn down.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-hairline bg-surface-lowest p-0 text-ink shadow-xl",
        className,
      )}
    >
      {open && (
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-low hover:text-ink"
          >
            <X className="size-5" />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
