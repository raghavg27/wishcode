"use client";

import { PartyPopper } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { WisherOptIn } from "@/components/email-opt-in";
import { Modal } from "@/components/modal";
import { DownloadImageButton, ShareTargets } from "@/components/share";
import { CardPreview } from "@/components/share-moment";
import { buttonStyles } from "@/components/ui";
import { track } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";

/**
 * Right after posting (/w/:id?posted=1): confetti, the wish card, the ways to
 * share it and, for a wisher not yet subscribed, the email opt-in. Closing it
 * drops ?posted=1 so a reload doesn't bring it back.
 */
export function PostedMoment({
  wishId,
  path,
  text,
  image,
  filename,
  askEmail,
}: {
  wishId: number;
  path: string;
  text: string;
  image: string;
  filename: string;
  askEmail: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    track("share_moment_shown", { card: "wish" });
    void celebrate();
  }, []);

  function close() {
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("posted");
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <Modal open={open} onClose={close} labelledBy={id}>
      <p className="flex items-center gap-2 text-label-sm font-semibold tracking-wider text-primary uppercase">
        <PartyPopper className="size-4" aria-hidden /> Wish posted
      </p>
      <h2 id={id} className="mt-1 font-serif text-display-sm text-ink sm:text-[34px] sm:leading-[42px]">
        Your wish is live
      </h2>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">
        Share it so others can me-too it. Every me-too tells developers it&apos;s worth building.
      </p>

      <CardPreview src={image} />

      <div className="mt-5">
        <ShareTargets path={path} text={text} card="wish">
          <DownloadImageButton src={image} filename={filename} path={path} card="wish" />
        </ShareTargets>
      </div>

      {askEmail && (
        <div className="mt-6 border-t border-hairline pt-5">
          <WisherOptIn wishId={wishId} subscribed={false} />
        </div>
      )}

      <div className="mt-6 flex justify-end border-t border-hairline pt-5">
        <button type="button" onClick={close} className={`${buttonStyles.dark} px-6`}>
          Done
        </button>
      </div>
    </Modal>
  );
}
