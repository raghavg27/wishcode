"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

// Sign-out takes a moment (Supabase call + redirect), so show a spinner and
// block repeat clicks until the page changes.
export function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={pending ? "Signing out" : "Sign out"}
      title={pending ? "Signing out…" : "Sign out"}
      className="flex size-8 items-center justify-center rounded-full text-outline hover:bg-surface-low hover:text-ink disabled:cursor-wait"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" />}
    </button>
  );
}
