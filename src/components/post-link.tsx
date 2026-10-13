"use client";

import clsx from "clsx";
import { CircleAlert, CircleCheck, Link2, Loader2, Unlink } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { postLink } from "@/app/actions";
import { Modal } from "@/components/modal";
import { toast } from "@/components/toaster";
import { Avatar, buttonStyles } from "@/components/ui";
import { track } from "@/lib/analytics";
import { LINK_DESCRIPTION_MAX } from "@/lib/config";
import type { DeveloperRef } from "@/lib/types";
import { charLength, URL_ISSUE_MESSAGES, urlIssue, validateLinkInput } from "@/lib/validation";

// One modal per wish page; any trigger on the page can open it.
let isOpen = false;
const listeners = new Set<() => void>();
function setOpen(value: boolean) {
  isOpen = value;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function loginHref(pathname: string, intent: "link" | "claim") {
  return `/login?next=${encodeURIComponent(`${pathname}?intent=${intent}`)}`;
}

export function PostLinkTrigger({
  signedIn,
  disabled,
  className,
  children,
}: {
  signedIn: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={() => {
        if (!signedIn) {
          track("github_connect_started", { intent: "link" });
          router.push(loginHref(pathname, "link"));
        } else setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

type Props = {
  wishId: number;
  wishText: string;
  developer: DeveloperRef | null;
  hasLinks: boolean;
  alreadyPosted: boolean;
};

export function PostLinkModal({ wishId, wishText, developer, hasLinks, alreadyPosted }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const id = useId();
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Returning from GitHub connect with ?intent=link reopens the form.
  useEffect(() => {
    if (searchParams.get("intent") === "link" && developer) {
      setOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, developer, pathname, router]);

  const { value, issues } = validateLinkInput({ url, description, repoUrl });
  const fieldError = (name: "url" | "description" | "repoUrl") => (touched[name] ? issues[name] : undefined) ?? serverFields[name];
  const liveUrlIssue = url.trim() ? urlIssue(url) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ url: true, description: true, repoUrl: true });
    if (Object.keys(issues).length > 0 || busy) return;
    setBusy(true);
    setError(null);
    setServerFields({});
    try {
      const result = await postLink(wishId, value);
      if (result.ok) {
        track("link_posted", { wish_id: wishId, first: !hasLinks });
        setOpen(false);
        setUrl("");
        setDescription("");
        setRepoUrl("");
        setTouched({});
        toast(hasLinks ? "Your link is live." : "Your link is live. This wish is now Fulfilled.", "success");
        router.refresh();
      } else {
        setError(result.message);
        if (result.fields) setServerFields(result.fields);
      }
    } catch {
      setError("Couldn't reach Wishcode. Check your connection and try again.");
    }
    setBusy(false);
  }

  const inputClass = (invalid: boolean) =>
    clsx(
      "w-full rounded-lg border bg-surface-lowest px-3 py-2.5 text-[15px] text-ink placeholder:text-stone focus:outline-2 focus:outline-offset-0",
      invalid ? "border-danger focus:outline-danger" : "border-hairline focus:outline-amber",
    );

  return (
    <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-title`}>
      <p className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-primary uppercase">
        <span className="size-2 rounded-full bg-amber" aria-hidden /> Developer submission
      </p>
      <h2 id={`${id}-title`} className="mt-1 font-serif text-display-sm text-ink sm:text-[34px] sm:leading-[42px]">
        Post a live link
      </h2>
      <blockquote className="mt-5 rounded-xl bg-surface-low p-4 font-serif text-[18px] leading-7 text-ink-muted italic">
        “{wishText}”
      </blockquote>

      {alreadyPosted ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface-low p-4 text-[14px] text-ink">
          <Unlink className="mt-0.5 size-5 shrink-0 text-outline" aria-hidden />
          <p>
            You&apos;ve already posted a link on this wish. One link per developer per wish: remove your existing link to post a new
            one.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-5 space-y-5">
          {developer && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-low p-3 text-[14px] text-ink-muted">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-lowest py-1 pr-3 pl-1 font-medium text-ink shadow-card">
                <Avatar dev={developer} size={24} />@{developer.handle}
              </span>
              <span>
                Posted as <strong className="text-ink">@{developer.handle}</strong>.{" "}
                {hasLinks ? (
                  "It will be listed alongside the other builds."
                ) : (
                  <>
                    As the first link, this wish becomes{" "}
                    <span className="inline-flex items-center gap-1 font-semibold text-leaf-ink">
                      <CircleCheck className="size-4" aria-hidden />
                      Fulfilled
                    </span>
                    .
                  </>
                )}
              </span>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor={`${id}-url`} className="text-label font-semibold text-ink">
                App URL <span className="text-danger">*</span>
              </label>
              <span className="text-caption text-ink-muted">Web app or download page</span>
            </div>
            <div className="relative">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-outline" aria-hidden />
              <input
                id={`${id}-url`}
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, url: true }))}
                aria-invalid={Boolean(fieldError("url")) || undefined}
                aria-describedby={`${id}-url-error`}
                className={clsx(inputClass(Boolean(fieldError("url"))), "pl-9")}
              />
            </div>
            <p id={`${id}-url-error`} className="mt-1.5 flex items-center gap-1.5 text-label text-danger empty:hidden">
              {(fieldError("url") || (liveUrlIssue === "not_https" ? URL_ISSUE_MESSAGES.not_https : null)) && (
                <>
                  <CircleAlert className="size-4" aria-hidden />
                  {fieldError("url") ?? URL_ISSUE_MESSAGES.not_https}
                </>
              )}
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor={`${id}-desc`} className="text-label font-semibold text-ink">
                One-line description <span className="text-danger">*</span>
              </label>
              <span className="text-caption text-ink-muted">What it does, briefly</span>
            </div>
            <input
              id={`${id}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
              placeholder="Lightweight menu bar app that…"
              aria-invalid={Boolean(fieldError("description")) || undefined}
              className={inputClass(Boolean(fieldError("description")))}
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-label">
              <span className="text-danger">{fieldError("description")}</span>
              <span className={clsx("tabular", charLength(value.description) > LINK_DESCRIPTION_MAX ? "text-danger" : "text-outline")}>
                {charLength(value.description)} / {LINK_DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor={`${id}-repo`} className="text-label font-semibold text-ink">
                Repo URL <span className="font-normal text-ink-muted">(optional)</span>
              </label>
            </div>
            <input
              id={`${id}-repo`}
              type="url"
              inputMode="url"
              placeholder="https://github.com/you/project"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, repoUrl: true }))}
              aria-invalid={Boolean(fieldError("repoUrl")) || undefined}
              className={inputClass(Boolean(fieldError("repoUrl")))}
            />
            {fieldError("repoUrl") && <p className="mt-1.5 text-label text-danger">{fieldError("repoUrl")}</p>}
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-label text-[#93000a]">
              <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <p className="text-caption text-ink-muted">
            Wishcode doesn&apos;t fetch, scan or review your link. It opens in a new tab for visitors.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={buttonStyles.ghost}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`${buttonStyles.amber} px-5 py-2.5`}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Post live link
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
