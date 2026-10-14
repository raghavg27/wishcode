"use client";

import { ArrowLeft, ArrowRight, Copy, Hand, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { StatusChip, buttonStyles } from "@/components/ui";
import { formatNumber, pluralize } from "@/lib/format";
import { wishPath } from "@/lib/site";
import type { SimilarWish } from "@/lib/types";

type Props = {
  open: boolean;
  typed: string;
  similar: SimilarWish[];
  busy: "post" | number | null;
  onClose: () => void;
  onMetoo: (wish: SimilarWish) => void;
  onPostAnyway: () => void;
};

function meta(w: SimilarWish) {
  if (w.status === "fulfilled" && w.first_link) return `Fulfilled by @${w.first_link.developer.handle}`;
  if (w.status === "being_built") return `${pluralize(w.claim_count, "dev")} building`;
  return null;
}

export function DuplicateModal({ open, typed, similar, busy, onClose, onMetoo, onPostAnyway }: Props) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="dup-title">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft/70 px-2.5 py-1 text-label-sm font-medium text-[#643f00]">
        <Copy className="size-3.5" aria-hidden /> Duplicate check
      </span>
      <h2 id="dup-title" className="mt-3 pr-8 font-serif text-display-sm text-ink sm:text-[34px] sm:leading-[42px]">
        Someone may have wished this already
      </h2>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">
        We found {similar.length === 1 ? "an existing wish" : `${similar.length} existing wishes`} with a close match. You can me-too
        {similar.length === 1 ? " it" : " one"} with a click, or post yours anyway.
      </p>

      <div className="mt-6 rounded-xl bg-surface-low p-4">
        <p className="text-label-sm font-semibold tracking-wider text-ink-muted uppercase">What you typed</p>
        <p className="mt-1 font-serif text-[19px] leading-7 font-medium text-ink">“{typed}”</p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-label-sm font-semibold tracking-wider text-ink-muted uppercase">Someone may have wished this already</h3>
        <span className="text-caption text-outline">Closest match first</span>
      </div>
      <ul className="mt-2 divide-y divide-hairline">
        {similar.map((w) => (
          <li key={w.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href={wishPath(w.id)} target="_blank" className="font-serif text-[19px] leading-7 font-medium text-ink hover:underline">
                {w.text}
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
                <StatusChip status={w.status} verified={w.verified} />
                <span className="inline-flex items-center gap-1 font-semibold text-ink tabular">
                  <Hand className="size-4 text-primary" aria-hidden /> {formatNumber(w.metoo_count)} me-toos
                </span>
                {meta(w) && <span>· {meta(w)}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onMetoo(w)}
              disabled={busy !== null}
              className={`${buttonStyles.amber} shrink-0 rounded-xl px-4 py-2.5`}
            >
              {busy === w.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Hand className="size-4" aria-hidden />}
              Me too on this one
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-2 flex items-start gap-2 rounded-lg bg-surface-low px-3 py-2.5 text-label text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Me-tooing pools your demand behind one wish, so developers see the real need.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onClose} className={buttonStyles.ghost}>
          <ArrowLeft className="size-4" aria-hidden /> Edit my wish
        </button>
        <button type="button" onClick={onPostAnyway} disabled={busy !== null} className={`${buttonStyles.quiet} px-5 py-2.5`}>
          {busy === "post" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Post mine anyway <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </Modal>
  );
}
