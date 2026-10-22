"use client";

import clsx from "clsx";
import { Hammer, Layers, ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Where the viewer is: the path, plus the feed's status filter on /wishes. */
type Location = { pathname: string; status: string | null };
type Match = (l: Location) => boolean;

// A status shortcut owns its filter; the plain feed link owns the rest of the
// feed and the wish pages under it.
const feed = (except: string): Match => (l) =>
  (l.pathname === "/wishes" && l.status !== except) || l.pathname.startsWith("/w/");
const filter = (status: string): Match => (l) => l.pathname === "/wishes" && l.status === status;

const LINKS: { href: string; label: string; match: Match }[] = [
  { href: "/wishes", label: "Wishes", match: feed("fulfilled") },
  { href: "/wishes?status=fulfilled", label: "Fulfilled", match: filter("fulfilled") },
  { href: "/principles", label: "Principles", match: (l) => l.pathname.startsWith("/principles") },
  { href: "/about", label: "About", match: (l) => l.pathname.startsWith("/about") },
];

function useLocation(): Location {
  return { pathname: usePathname(), status: useSearchParams().get("status") };
}

export function NavLinks() {
  return <NavLinksView location={useLocation()} />;
}

/** Rendered without highlighting while the location streams in. */
export function NavLinksView({ location }: { location: Location | null }) {
  return (
    <nav aria-label="Main" className="ml-4 hidden items-center gap-1 sm:flex">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={location && l.match(location) ? "page" : undefined}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-label font-medium transition-colors",
            location && l.match(location) ? "bg-surface-low text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const MOBILE = [
  { href: "/wishes", label: "Wishes", icon: Layers, match: feed("being_built") },
  { href: "/wishes?status=being_built", label: "Building", icon: Hammer, match: filter("being_built") },
  {
    href: "/developers",
    label: "Builders",
    icon: Users,
    match: (l: Location) => l.pathname.startsWith("/developers") || l.pathname.startsWith("/d/"),
  },
  { href: "/principles", label: "Principles", icon: ScrollText, match: (l: Location) => l.pathname.startsWith("/principles") },
];

export function MobileNav() {
  const location = useLocation();
  // The wish page has its own sticky action bar.
  if (location.pathname.startsWith("/w/")) return null;
  return <MobileNavView location={location} />;
}

export function MobileNavView({ location }: { location: Location }) {
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
              aria-current={match(location) ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-caption font-medium",
                match(location) ? "text-primary" : "text-ink-muted",
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
