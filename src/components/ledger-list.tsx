"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Inbox, Lamp, Laptop, Tumbleweed } from "@/components/doodles";
import { EmptyState, buttonStyles } from "@/components/ui";
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

const EMPTY: Record<StatusFilter, Parameters<typeof EmptyState>[0]> = {
  all: { doodle: Lamp, title: "No wishes yet. Rub the lamp.", action: { href: "/wishes#compose", label: "Post the first wish" } },
  open: {
    doodle: Inbox,
    title: "Everything's being built or done. Wild.",
    action: { href: "/wishes?status=fulfilled", label: "See what's been built" },
  },
  being_built: {
    doodle: Laptop,
    title: "Nobody's building yet. First one in gets bragging rights.",
    action: { href: "/wishes?status=open", label: "Browse open wishes" },
  },
  fulfilled: {
    doodle: Tumbleweed,
    title: "Nothing fulfilled yet. This tumbleweed is waiting for a hero.",
    action: { href: "/wishes?status=open", label: "Browse open wishes" },
  },
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

  if (items.length === 0) return <EmptyState {...EMPTY[status]} />;

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
