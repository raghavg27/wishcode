"use client";

import clsx from "clsx";
import { ImageOff, PartyPopper, Share2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { DownloadImageButton, ShareTargets } from "@/components/share";
import { Skeleton, buttonStyles } from "@/components/ui";
import { track } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import type { ShareMomentProps } from "@/lib/share-copy";

const COPY = {
  developer: {
    eyebrow: "Shipped",
    title: "You built it",
    body: "Here's your card. Post it: it links straight to your build on the wish.",
  },
  wisher: {
    eyebrow: "Wish granted",
    title: "Your wish came true",
    body: "Here's your card. Share it and give the developer who built it some credit.",
  },
} as const;

/**
 * "You built it" / "Your wish came true": the card, the ways to share it, and
 * Done. Mounting it counts as the moment being shown.
 */
export function ShareMoment({ share, titleId, onDone }: { share: ShareMomentProps; titleId?: string; onDone: () => void }) {
  const copy = COPY[share.card];

  useEffect(() => {
    track("share_moment_shown", { card: share.card });
    void celebrate();
  }, [share.card]);

  return (
    <div>
      <p className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-primary uppercase">
        <PartyPopper className="size-4" aria-hidden /> {copy.eyebrow}
      </p>
      <h2 id={titleId} className="mt-1 font-serif text-display-sm text-ink sm:text-[34px] sm:leading-[42px]">
        {copy.title}
      </h2>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">{copy.body}</p>

      <CardPreview src={share.image} />

      <div className="mt-5">
        <ShareTargets path={share.path} text={share.text} card={share.card}>
          <DownloadImageButton src={share.image} filename={share.filename} path={share.path} card={share.card} />
        </ShareTargets>
      </div>

      <div className="mt-6 flex justify-end border-t border-hairline pt-5">
        <button type="button" onClick={onDone} className={`${buttonStyles.dark} px-6`}>
          Done
        </button>
      </div>
    </div>
  );
}

function CardPreview({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");

  // A cached image can finish loading before hydration attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setState("loaded");
  }, []);

  return (
    <div className="relative mt-5 aspect-[1200/630] overflow-hidden rounded-xl border border-hairline bg-surface-low">
      {state === "loading" && <Skeleton className="absolute inset-0 rounded-none" />}
      {state === "failed" ? (
        <p className="absolute inset-0 flex items-center justify-center gap-2 text-label text-ink-muted">
          <ImageOff className="size-4" aria-hidden /> The preview didn&apos;t load, but the link still works.
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- the card is already a sized PNG from /api/og
        <img
          ref={ref}
          src={src}
          alt="Share card preview"
          width={1200}
          height={630}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={clsx("size-full object-cover transition-opacity", state === "loaded" ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}

/** A share moment in a modal, controlled by the caller. */
export function ShareMomentModal({ share, open, onClose }: { share: ShareMomentProps; open: boolean; onClose: () => void }) {
  const id = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={id}>
      <ShareMoment share={share} titleId={id} onDone={onClose} />
    </Modal>
  );
}

/** A small Share button that reopens a share moment later. */
export function ShareMomentButton({
  share,
  label = "Share",
  className,
}: {
  share: ShareMomentProps;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex items-center gap-1.5 text-label font-medium text-ink hover:underline",
          className,
        )}
      >
        <Share2 className="size-4" aria-hidden /> {label}
      </button>
      <ShareMomentModal share={share} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
