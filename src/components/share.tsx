"use client";

import clsx from "clsx";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { LinkedinIcon, XIcon } from "@/components/icons";
import { toast } from "@/components/toaster";
import { track } from "@/lib/analytics";

function absolute(path: string) {
  return new URL(path, window.location.origin).toString();
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Icon button: native share sheet where available, otherwise copies the link. */
export function ShareIconButton({ path, text, className }: { path: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    const url = absolute(path);
    track("share", { path, method: "icon" });
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Wishcode", text, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    if (await copy(url)) {
      setCopied(true);
      toast("Link copied", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share wish"
      className={clsx(
        "flex size-9 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-low hover:text-ink",
        className,
      )}
    >
      {copied ? <Check className="size-[18px] text-leaf" /> : <Share2 className="size-[18px]" />}
    </button>
  );
}

export function CopyLinkButton({ path, className, label = "Copy link" }: { path: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        track("share", { path, method: "copy" });
        if (await copy(absolute(path))) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast("Couldn't copy. Long-press the address bar to copy the link.");
        }
      }}
      className={clsx(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface-lowest px-3 text-label font-medium text-ink transition-colors hover:bg-surface-low",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-leaf" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ShareTargets({ path, text }: { path: string; text: string }) {
  const targets = [
    {
      name: "X",
      icon: <XIcon className="size-3.5" />,
      href: (url: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle className="size-4" aria-hidden />,
      href: (url: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      name: "LinkedIn",
      icon: <LinkedinIcon className="size-3.5" />,
      href: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {targets.map((t) => (
        <button
          key={t.name}
          type="button"
          onClick={() => {
            track("share", { path, method: t.name });
            window.open(t.href(absolute(path)), "_blank", "noopener,noreferrer");
          }}
          aria-label={`Share on ${t.name}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface-lowest px-3 text-label font-medium text-ink transition-colors hover:bg-surface-low"
        >
          {t.icon}
          <span className="hidden sm:inline">{t.name}</span>
        </button>
      ))}
      <CopyLinkButton path={path} />
    </div>
  );
}
