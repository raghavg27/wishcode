import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { FEED_PAGE_SIZE, type Sort, type StatusFilter } from "@/lib/config";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { readDeviceHash } from "@/lib/identity";
import { db } from "@/lib/supabase/admin";
import type { DeveloperProfile, DirectoryEntry, FeedPage, LedgerStats, WishCard, WishDetail } from "@/lib/types";

// Public reads are cached in the Next.js data cache and shared by every
// visitor; per-viewer state (me-toos, session) is read separately per request.
// Writes invalidate these tags in src/app/actions.ts.

export const tags = {
  ledger: "ledger",
  stats: "stats",
  directory: "directory",
  wish: (id: number) => `wish:${id}`,
  developer: (handle: string) => `dev:${handle.toLowerCase()}`,
};

export async function getLedgerPage(status: StatusFilter, sort: Sort, cursor: string | null): Promise<FeedPage> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 15, expire: 300 });
  cacheTag(tags.ledger);

  const after = decodeCursor(sort, cursor);
  const { data, error } = await db().rpc("ledger_feed", {
    p_status: status === "all" ? null : status,
    p_sort: sort,
    p_after_ts: after?.ts ?? null,
    p_after_count: after?.count ?? null,
    p_after_id: after?.id ?? null,
    p_limit: FEED_PAGE_SIZE,
  });
  if (error) throw error;
  const items = (data ?? []) as WishCard[];
  return {
    items,
    nextCursor: items.length === FEED_PAGE_SIZE ? encodeCursor(sort, items[items.length - 1]) : null,
  };
}

export async function getStats(): Promise<LedgerStats> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 900 });
  cacheTag(tags.stats);

  const { data, error } = await db().rpc("ledger_stats");
  if (error) throw error;
  return data as LedgerStats;
}

export async function getWish(id: number): Promise<WishDetail | null> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  cacheTag(tags.wish(id));

  const { data, error } = await db().rpc("get_wish", { p_id: id });
  if (error) throw error;
  return (data as WishDetail | null) ?? null;
}

export async function getDeveloperProfile(handle: string): Promise<DeveloperProfile | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag(tags.developer(handle));

  const { data, error } = await db().rpc("developer_profile", { p_handle: handle });
  if (error) throw error;
  return (data as DeveloperProfile | null) ?? null;
}

export async function getDirectory(): Promise<DirectoryEntry[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(tags.directory);

  const { data, error } = await db().rpc("developer_directory", { p_limit: 100 });
  if (error) throw error;
  return (data ?? []) as DirectoryEntry[];
}

/** Which of these wishes this browser has me-too'd. Never cached. */
export async function getViewerMetoos(wishIds: number[]): Promise<number[]> {
  if (wishIds.length === 0) return [];
  await connection();
  const hash = await readDeviceHash();
  if (!hash) return [];
  const { data, error } = await db().rpc("viewer_metoos", { p_token_hash: hash, p_wish_ids: wishIds });
  if (error) {
    console.error("[viewer_metoos]", error);
    return [];
  }
  return ((data ?? []) as (number | string)[]).map(Number);
}

/** Parses a /w/:id path segment. */
export function parseWishId(raw: string): number | null {
  if (!/^[1-9][0-9]{0,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

export async function getSitemapEntries(): Promise<{ wishes: { id: number; updated_at: string }[]; developers: string[] }> {
  "use cache";
  cacheLife("hours");

  const { data, error } = await db().rpc("sitemap_entries");
  if (error) throw error;
  return data as { wishes: { id: number; updated_at: string }[]; developers: string[] };
}
