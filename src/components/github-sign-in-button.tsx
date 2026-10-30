"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { GithubIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";

// Shows a spinner while the action fetches the GitHub URL and the browser
// leaves. Coming Back from GitHub can restore this page from the back/forward
// cache with the spinner still on, so reload it fresh in that case.
export function GithubSignInButton() {
  const { pending } = useFormStatus();

  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${buttonStyles.dark} w-full rounded-xl py-4 text-[16px] disabled:cursor-wait`}
    >
      {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GithubIcon className="size-5" />}
      {pending ? "Opening GitHub…" : "Continue with GitHub"}
      {!pending && <ArrowRight className="size-4" aria-hidden />}
    </button>
  );
}
