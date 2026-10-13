"use client";

import clsx from "clsx";
import { Hammer, Layers, ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Ledger", match: (p: string) => p === "/" },
  { href: "/?status=fulfilled", label: "Fulfilled", match: () => false },
  { href: "/principles", label: "Principles", match: (p: string) => p.startsWith("/principles") },
];

export function NavLinks() {
  return <NavLinksView pathname={usePathname()} />;
}

/** Rendered without highlighting while the pathname streams in. */
export function NavLinksView({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="ml-4 hidden items-center gap-1 sm:flex">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.match(pathname) ? "page" : undefined}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-label font-medium transition-colors",
            l.match(pathname) ? "bg-surface-low text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const MOBILE = [
  { href: "/", label: "Ledger", icon: Layers, match: (p: string) => p === "/" },
  { href: "/?status=being_built", label: "Building", icon: Hammer, match: () => false },
  { href: "/developers", label: "Builders", icon: Users, match: (p: string) => p.startsWith("/developers") || p.startsWith("/d/") },
  { href: "/principles", label: "Charter", icon: ScrollText, match: (p: string) => p.startsWith("/principles") },
];

export function MobileNav() {
  const pathname = usePathname();
  // The wish page has its own sticky action bar.
  if (pathname.startsWith("/w/")) return null;
  return <MobileNavView pathname={pathname} />;
}

export function MobileNavView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {MOBILE.map(({ href, label, icon: Icon, match }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={match(pathname) ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-caption font-medium",
                match(pathname) ? "text-primary" : "text-ink-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
