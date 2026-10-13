import { Archive } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-low text-outline">
          <Archive className="size-6" aria-hidden />
        </span>
        <h1 className="font-serif text-display-sm text-ink">Not on the ledger</h1>
        <p className="mt-2 text-[15px] text-ink-muted">That page doesn&apos;t exist, or the link is mistyped.</p>
        <Link href="/" className={`${buttonStyles.amber} mt-6`}>
          Back to the ledger
        </Link>
      </div>
    </main>
  );
}
