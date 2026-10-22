import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-low pb-20 md:pb-0">
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-4 py-8 md:flex-row md:items-center">
        <div className="max-w-2xl space-y-1">
          <p className="text-label font-medium text-ink">Post an app you wish existed. Someone might build it.</p>
          <p className="text-caption text-ink-muted">
            No account needed to wish. Any developer can build one. I don&apos;t check links before they go up.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-label-sm text-ink-muted">
          <Link href="/wishes" className="hover:text-ink">
            Wishes
          </Link>
          <Link href="/developers" className="hover:text-ink">
            Builders
          </Link>
          <Link href="/principles" className="hover:text-ink">
            Principles
          </Link>
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
