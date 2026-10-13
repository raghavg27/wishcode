"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonStyles } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-display-sm text-ink">The ledger hiccupped</h1>
        <p className="mt-2 text-[15px] text-ink-muted">Something went wrong loading this page. It&apos;s usually temporary.</p>
        {error.digest && <p className="mt-2 font-mono text-caption text-outline">Ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className={buttonStyles.amber}>
            <RotateCcw className="size-4" aria-hidden /> Try again
          </button>
          <Link href="/" className={buttonStyles.quiet}>
            Go to the ledger
          </Link>
        </div>
      </div>
    </main>
  );
}
