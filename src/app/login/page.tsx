import { ArrowLeft, ArrowRight, CircleAlert, Heart, KeyRound, ShieldCheck, SquareTerminal, EyeOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signInWithGithub } from "@/app/auth/actions";
import { GithubIcon } from "@/components/icons";
import { Avatar, Skeleton, buttonStyles } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { DISCLAIMER } from "@/lib/config";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Connect GitHub",
  description: "Developers connect GitHub to claim wishes and post live links.",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  denied: "GitHub sign-in was cancelled.",
  not_github: "We couldn't read your GitHub profile. Please try again.",
  unavailable: "GitHub sign-in is unavailable right now. Please try again shortly.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-20">
      <div className="w-full max-w-[560px]">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-label font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Back to ledger
          </Link>
          <span className="text-label-sm tracking-wider text-outline uppercase">Auth · Step 1 of 1</span>
        </div>
        <div className="card relative overflow-hidden px-6 py-10 text-center sm:px-12">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber/20 via-amber/70 to-amber/20" aria-hidden />
          <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-surface-low">
            <SquareTerminal className="size-7 text-ink" aria-hidden />
          </span>
          <h1 className="font-serif text-display-sm text-ink sm:text-display">Connect GitHub to claim or post a link</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-ink-muted">
            Your GitHub identity goes on every claim and live link you post, so wishers know who built what.
          </p>
          <Suspense fallback={<Skeleton className="mx-auto mt-8 h-14 w-full rounded-xl" />}>
            <LoginAction searchParams={searchParams} />
          </Suspense>
          <p className="mt-3 text-label text-ink-muted">We use your GitHub handle and avatar. Nothing else.</p>

          <div className="my-8 flex items-center gap-4 text-label-sm tracking-wider text-ink-muted uppercase">
            <span className="h-px flex-1 bg-hairline" /> Community etiquette <span className="h-px flex-1 bg-hairline" />
          </div>
          <p className="flex items-start gap-3 rounded-xl bg-surface-low p-4 text-left text-[15px] leading-6 text-ink">
            <Heart className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <span>
              Just here to wish? Posting and me-too never need an account.{" "}
              <Link href="/" className="font-medium text-primary underline underline-offset-2">
                Return to the ledger →
              </Link>
            </span>
          </p>
          <ul className="mt-4 space-y-2 rounded-xl bg-surface-low p-4 text-left text-label text-ink">
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-leaf-strong" aria-hidden /> No repository access requested
            </li>
            <li className="flex items-center gap-3">
              <EyeOff className="size-4 text-leaf-strong" aria-hidden /> No tracking cookies; one session cookie
            </li>
            <li className="flex items-center gap-3">
              <KeyRound className="size-4 text-leaf-strong" aria-hidden /> Sign out any time from the header
            </li>
          </ul>
          <p className="mt-8 text-label-sm text-ink-muted">{DISCLAIMER}</p>
        </div>
      </div>
    </main>
  );
}

async function LoginAction({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const error = typeof sp.error === "string" ? (ERRORS[sp.error] ?? "Sign-in failed. Please try again.") : null;
  const { developer } = await getViewer().catch(() => ({ developer: null }));

  if (developer) {
    return (
      <div className="mt-8 space-y-4">
        <p className="flex items-center justify-center gap-2 text-[15px] text-ink">
          <Avatar dev={developer} size={28} /> Connected as <strong>@{developer.handle}</strong>
        </p>
        <Link href={next} className={`${buttonStyles.dark} w-full rounded-xl py-4 text-[16px]`}>
          Continue <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <form action={signInWithGithub} className="mt-8">
      {error && (
        <p role="alert" className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-label text-[#93000a]">
          <CircleAlert className="size-4" aria-hidden /> {error}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <button type="submit" className={`${buttonStyles.dark} w-full rounded-xl py-4 text-[16px]`}>
        <GithubIcon className="size-5" /> Continue with GitHub <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
