"use client";

import clsx from "clsx";
import { CircleCheck, Hammer, Link2, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeLink, setClaim } from "@/app/actions";
import { GithubIcon } from "@/components/icons";
import { loginHref, PostLinkTrigger } from "@/components/post-link";
import { TimeAgo } from "@/components/time-ago";
import { toast } from "@/components/toaster";
import { Avatar, buttonStyles } from "@/components/ui";
import { track } from "@/lib/analytics";
import { developerPath } from "@/lib/site";
import type { DeveloperRef, WishClaim, WishStatus } from "@/lib/types";

type Props = {
  wishId: number;
  status: WishStatus;
  removed: boolean;
  claims: WishClaim[];
  developer: DeveloperRef | null;
  viewerLinkId: number | null;
};

export function DeveloperPanel({ wishId, status, removed, claims, developer, viewerLinkId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"claim" | null>(null);
  const autoClaimed = useRef(false);
  const claimed = Boolean(developer && claims.some((c) => c.developer.id === developer.id));

  async function toggleClaim(active: boolean) {
    if (!developer) {
      track("github_connect_started", { intent: "claim" });
      router.push(loginHref(pathname, "claim"));
      return;
    }
    setBusy("claim");
    try {
      const result = await setClaim(wishId, active);
      if (result.ok) {
        if (active) track("claim", { wish_id: wishId });
        toast(active ? "You're listed as building this wish." : "Claim removed.", "success");
        startTransition(() => router.refresh());
      } else toast(result.message);
    } catch {
      toast("Couldn't reach Wishcode. Check your connection and try again.");
    }
    setBusy(null);
  }

  // Returning from GitHub connect with ?intent=claim completes the claim.
  useEffect(() => {
    if (searchParams.get("intent") !== "claim" || !developer || autoClaimed.current) return;
    autoClaimed.current = true;
    router.replace(pathname, { scroll: false });
    if (!claimed && !removed) void Promise.resolve().then(() => toggleClaim(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, developer]);

  const working = busy !== null || pending;

  return (
    <section className="card overflow-hidden" aria-labelledby="dev-panel-title">
      <div className="p-6">
        <h2 id="dev-panel-title" className="flex items-center gap-2 font-serif text-[20px] leading-7 font-semibold text-ink">
          <Hammer className="size-5 text-primary" aria-hidden /> For developers
        </h2>
        <p className="mt-2 text-[14px] leading-[22px] text-ink-muted">
          {status === "fulfilled"
            ? "Built something for this, or planning to? This wish is fulfilled, but alternative builds, platforms and forks are always welcome."
            : "Planning to build this? Claim it so others know, or post a live link when it works."}
        </p>

        {developer && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-low p-3">
            <Avatar dev={developer} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-semibold text-ink">@{developer.handle}</p>
              <p className="flex items-center gap-1 text-caption text-ink-muted">
                <GithubIcon className="size-3" /> GitHub connected
              </p>
            </div>
            <span className="rounded-md bg-amber-soft px-2 py-0.5 text-caption font-semibold text-[#643f00]">You</span>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {claimed ? (
            <div className="flex items-center justify-between rounded-lg bg-leaf-soft px-3 py-2.5 text-label font-medium text-leaf-ink">
              <span className="flex items-center gap-2">
                <CircleCheck className="size-4" aria-hidden /> You&apos;re building this
              </span>
              <button
                type="button"
                onClick={() => toggleClaim(false)}
                disabled={working}
                className="text-label-sm text-ink-muted underline decoration-dotted hover:text-ink disabled:opacity-50"
              >
                Unclaim
              </button>
            </div>
          ) : null}

          {viewerLinkId ? (
            <RemoveOwnLink linkId={viewerLinkId} />
          ) : (
            <PostLinkTrigger signedIn={Boolean(developer)} disabled={removed} className={clsx(buttonStyles.amber, "w-full py-2.5")}>
              <Link2 className="size-4" aria-hidden /> Post a live link
            </PostLinkTrigger>
          )}

          {!claimed && !viewerLinkId && (
            <button
              type="button"
              onClick={() => toggleClaim(true)}
              disabled={working || removed}
              className={clsx(buttonStyles.quiet, "w-full py-2.5")}
            >
              {busy === "claim" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
              I&apos;m building this
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-caption text-ink-muted">
          {developer ? "No deadlines, no claim limits. Anyone can ship code." : "Requires GitHub. No deadlines, no claim limits. Anyone can ship code."}
        </p>
      </div>

      {claims.length > 0 && (
        <div className="border-t border-hairline px-6 py-5">
          <h3 className="mb-3 flex items-center justify-between text-label-sm font-semibold tracking-wider text-ink uppercase">
            Building it ({claims.length})
            <span className="size-2 rounded-full bg-craft" aria-hidden />
          </h3>
          <ul className="space-y-2">
            {claims.map((c) => (
              <li key={c.developer.id}>
                <Link
                  href={developerPath(c.developer.handle)}
                  className="flex items-center gap-3 rounded-lg bg-surface-low p-2.5 transition-colors hover:bg-surface-container"
                >
                  <Avatar dev={c.developer} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-label font-medium text-ink">
                      @{c.developer.handle}
                      {developer?.id === c.developer.id && <span className="ml-1 text-primary">(You)</span>}
                    </span>
                    <TimeAgo iso={c.created_at} prefix="claimed" className="block text-caption text-ink-muted" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function RemoveOwnLink({ linkId, compact }: { linkId: number; compact?: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function remove() {
    setBusy(true);
    try {
      const result = await removeLink(linkId);
      if (result.ok) {
        toast("Your link was removed.", "success");
        startTransition(() => router.refresh());
      } else toast(result.message);
    } catch {
      toast("Couldn't reach Wishcode. Check your connection and try again.");
    }
    setBusy(false);
    setConfirming(false);
  }

  if (compact) {
    return confirming ? (
      <span className="flex items-center gap-2 text-label">
        <span className="text-ink-muted">Remove link?</span>
        <button type="button" onClick={remove} disabled={busy} className="font-semibold text-danger hover:underline">
          {busy ? "Removing…" : "Yes, remove"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-ink-muted hover:text-ink">
          Cancel
        </button>
      </span>
    ) : (
      <button type="button" onClick={() => setConfirming(true)} className="text-label font-medium text-danger hover:underline">
        Remove
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-surface-low px-3 py-2.5 text-label">
      <p className="flex items-center gap-2 font-medium text-ink">
        <CircleCheck className="size-4 text-leaf" aria-hidden /> You posted a link here
      </p>
      <p className="mt-1 text-label-sm text-ink-muted">One link per developer. Remove it to post a new one.</p>
      <div className="mt-2">
        <RemoveOwnLink linkId={linkId} compact />
      </div>
    </div>
  );
}
