import { Code, Coffee, Flag, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions";
import { HeaderShell } from "@/components/header-shell";
import { LogoMark } from "@/components/icons";
import { LiveVisitors } from "@/components/live-visitors";
import { NavLinks, NavLinksView } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { developerPath, SUPPORT_URL } from "@/lib/site";

function ConnectLink() {
  return (
    <Link
      href="/login"
      className="hidden items-center gap-1 text-label-sm font-medium text-ink-muted transition-colors hover:text-ink lg:flex"
    >
      <Code className="size-[18px]" aria-hidden />
      Connect GitHub <span className="text-caption font-normal text-outline">(for developers)</span>
    </Link>
  );
}

async function HeaderAuth() {
  const { developer } = await getViewer().catch(() => ({ developer: null }));
  if (!developer) return <ConnectLink />;
  return (
    <div className="flex items-center gap-1">
      {developer.is_admin && (
        <Link
          href="/admin"
          aria-label="Reports"
          title="Reports"
          className="flex size-8 items-center justify-center rounded-full text-outline hover:bg-surface-low hover:text-ink"
        >
          <Flag className="size-4" />
        </Link>
      )}
      <Link
        href={developerPath(developer.handle)}
        className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-label-sm font-medium text-ink hover:bg-surface-low"
      >
        <Avatar dev={developer} size={26} />
        <span className="hidden lg:inline">@{developer.handle}</span>
      </Link>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </div>
  );
}

export function SiteHeader() {
  return (
    <HeaderShell className="sticky top-0 z-50 bg-surface-lowest/80 shadow-[0_1px_8px_rgba(29,27,69,0.04)] backdrop-blur-md transition-[background-color,box-shadow] duration-300">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2" aria-label="Wishcode home">
            <LogoMark className="size-7" />
            <span className="font-serif text-headline font-semibold tracking-tight text-ink">Wishcode</span>
          </Link>
          <Suspense fallback={<NavLinksView location={null} />}>
            <NavLinks />
          </Suspense>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <LiveVisitors url={env.supabaseUrl} publishableKey={env.supabasePublishableKey} />
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support this project"
            title="Support this project"
            className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-low hover:text-ink"
          >
            <Coffee className="size-[18px]" />
          </a>
          <Suspense fallback={<ConnectLink />}>
            <HeaderAuth />
          </Suspense>
          <Link
            href="/wishes#compose"
            className="inline-flex items-center gap-1 rounded-lg bg-amber px-3.5 py-2 text-label font-semibold whitespace-nowrap text-on-amber shadow-[0_1px_2px_rgba(29,27,69,0.08)] transition-colors hover:bg-amber-hover sm:px-4"
          >
            <Plus className="size-[18px]" aria-hidden />
            <span className="lg:hidden">Post</span>
            <span className="hidden lg:inline">Post a wish</span>
          </Link>
        </div>
      </div>
    </HeaderShell>
  );
}
