import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Skeleton, buttonStyles } from "@/components/ui";
import { domainOf } from "@/lib/format";

// Shared layout for the pages that links in emails open (/e/*). GETs never
// change anything: mail scanners open every link.

export function EmailShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-[520px]">{children}</div>
    </main>
  );
}

export function EmailNotice({
  eyebrow,
  title,
  body,
  href = "/wishes",
  cta = "Back to all wishes",
}: {
  eyebrow?: string;
  title: string;
  body?: React.ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <>
      {eyebrow && <p className="text-label-sm font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>}
      <h1 className="mt-2 font-serif text-display-sm text-ink">{title}</h1>
      {body && <p className="mt-3 text-[15px] leading-6 text-ink-muted">{body}</p>}
      <Link href={href} className={`${buttonStyles.quiet} mt-8`}>
        <ArrowLeft className="size-4" aria-hidden /> {cta}
      </Link>
    </>
  );
}

export function InvalidEmailLink() {
  return <EmailNotice title="This link has expired or does not work." body="Links in Wishcode emails only work exactly as they were sent." />;
}

export function WishQuote({ text }: { text: string }) {
  return (
    <blockquote className="border-l-[3px] border-amber pl-4 font-serif text-[22px] leading-8 text-ink">“{text}”</blockquote>
  );
}

export function LinkSummary({ handle, description, url }: { handle: string; description: string; url: string }) {
  return (
    <div className="card mt-6 p-5">
      <p className="text-label-sm text-ink-muted">
        <strong className="font-semibold text-ink">@{handle}</strong> built it
      </p>
      <p className="mt-2 text-[15px] leading-6 text-ink">{description}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="mt-3 inline-flex items-center gap-1.5 font-mono text-label-sm text-primary hover:underline"
      >
        {domainOf(url)} <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}

export function EmailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-48" />
    </div>
  );
}
