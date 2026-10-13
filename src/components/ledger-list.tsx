"use client";

import { Archive, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui";
import { WishCard } from "@/components/wish-card";
import type { Sort, StatusFilter } from "@/lib/config";
import type { WishCard as Wish } from "@/lib/types";

type Props = {
  status: StatusFilter;
  sort: Sort;
  initialItems: Wish[];
  initialCursor: string | null;
  initialMetoos: number[];
};

const EMPTY_COPY: Record<StatusFilter, { title: string; body: string }> = {
  all: { title: "No wishes yet.", body: "Be the first to wish for something." },
  open: { title: "No open wishes.", body: "Every wish is being built or fulfilled." },
  being_built: { title: "Nothing being built yet.", body: "Claim an open wish and get started." },
  fulfilled: { title: "Nothing fulfilled yet.", body: "Be the first to ship one." },
};

export function LedgerList({ status, sort, initialItems, initialCursor, initialMetoos }: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [metoos, setMetoos] = useState(() => new Set(initialMetoos));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const inflight = useRef(false);

  async function loadMore() {
    if (!cursor || inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ status, sort, cursor });
      const res = await fetch(`/api/wishes?${params}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as { items: Wish[]; nextCursor: string | null; viewerMetoos: number[] };
      setItems((prev) => {
        const seen = new Set(prev.map((w) => w.id));
        return [...prev, ...page.items.filter((w) => !seen.has(w.id))];
      });
      setMetoos((prev) => new Set([...prev, ...page.viewerMetoos]));
      setCursor(page.nextCursor);
    } catch {
      setError(true);
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }

  // Auto-load as the end of the list approaches; the button stays as a fallback.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: "600px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, error]);

  if (items.length === 0) {
    const copy = EMPTY_COPY[status];
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-surface-low text-outline">
          <Archive className="size-5" aria-hidden />
        </span>
        <h2 className="font-serif text-[26px] leading-9 text-ink">{copy.title}</h2>
        <p className="mt-1 text-[14px] text-ink-muted">{copy.body}</p>
        {status !== "open" && status !== "all" ? (
          <Link href="/?status=open" className={`${buttonStyles.amber} mt-6`}>
            See open wishes <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <a href="#compose" className={`${buttonStyles.amber} mt-6`}>
            Make a wish <ArrowRight className="size-4" aria-hidden />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((wish) => (
        <WishCard key={wish.id} wish={wish} metooActive={metoos.has(wish.id)} />
      ))}
      <div ref={sentinel} />
      {cursor && (
        <div className="flex justify-center py-2">
          <button type="button" onClick={loadMore} disabled={loading} className={buttonStyles.quiet}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {error ? "Couldn't load more. Try again" : loading ? "Loading…" : "Load more wishes"}
          </button>
        </div>
      )}
    </div>
  );
}
