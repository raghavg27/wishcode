import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-low pb-20 sm:pb-0">
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-4 py-8 md:flex-row md:items-center">
        <div className="max-w-2xl space-y-1">
          <p className="text-label font-medium text-ink">Wishcode is a public ledger of software wishes.</p>
          <p className="text-caption text-ink-muted">
            No accounts required. Open claims for developers. Wishcode does not check or vouch for linked apps.
          </p>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-5 text-label-sm text-ink-muted">
          <Link href="/" className="hover:text-ink">
            Live feed
          </Link>
          <Link href="/developers" className="hover:text-ink">
            Developers
          </Link>
          <Link href="/principles" className="hover:text-ink">
            Guidelines
          </Link>
        </nav>
      </div>
    </footer>
  );
}
