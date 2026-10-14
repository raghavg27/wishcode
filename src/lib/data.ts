import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { FEED_PAGE_SIZE, type Sort, type StatusFilter } from "@/lib/config";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { readDeviceHash } from "@/lib/identity";
import { db } from "@/lib/supabase/admin";
import type {
  DeveloperProfile,
  DirectoryEntry,
  FeedPage,
  LedgerStats,
  ViewerWishState,
  WishCard,
  WishDetail,
} from "@/lib/types";

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

/**
 * Which wish a link belongs to (deleted links included; callers check the
 * wish's links). Uncached so a miss for a brand-new link never sticks.
 */
export async function getLinkWishId(linkId: number): Promise<number | null> {
  const { data, error } = await db().from("links").select("wish_id").eq("id", linkId).maybeSingle();
  if (error) throw error;
  return data ? Number(data.wish_id) : null;
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

export type LiveMetoos = { counts: Map<number, number>; mine: number[] };

/**
 * Current me-too counts for these wishes, and which of them this browser has
 * me-too'd. Never cached: one primary-key lookup per page keeps counts live
 * while the feed and wish entries above stay cached. Falls back to the cached
 * counts if the lookup fails.
 */
export async function getLiveMetoos(wishIds: number[]): Promise<LiveMetoos> {
  const live: LiveMetoos = { counts: new Map(), mine: [] };
  if (wishIds.length === 0) return live;
  await connection();
  const hash = await readDeviceHash();
  const { data, error } = await db().rpc("live_metoos", { p_token_hash: hash, p_wish_ids: wishIds });
  if (error) {
    console.error("[live_metoos]", error);
    return live;
  }
  for (const row of (data ?? []) as { wish_id: number | string; metoo_count: number; mine: boolean }[]) {
    const id = Number(row.wish_id);
    live.counts.set(id, row.metoo_count);
    if (row.mine) live.mine.push(id);
  }
  return live;
}

const NO_VIEWER_STATE: ViewerWishState = { is_wisher: false, has_metoo: false, subscribed: false, verdicts: {} };

/**
 * Whether this browser posted the wish, me-too'd it, subscribed to it, and
 * its votes on the wish's links. Never cached; skipped without a device
 * cookie. Falls back to "nothing" if the lookup fails.
 */
export async function getViewerWishState(wishId: number): Promise<ViewerWishState> {
  await connection();
  const hash = await readDeviceHash();
  if (!hash) return NO_VIEWER_STATE;
  const { data, error } = await db().rpc("viewer_wish_state", { p_token_hash: hash, p_wish_id: wishId });
  if (error) {
    console.error("[viewer_wish_state]", error);
    return NO_VIEWER_STATE;
  }
  return (data as ViewerWishState | null) ?? NO_VIEWER_STATE;
}

export type SubscriptionContext = { wish_id: number; unsubscribed: boolean; suppressed: boolean };

/** Which wish an email token is for. Never cached; never the address. */
export async function getSubscriptionContext(subscriptionId: number): Promise<SubscriptionContext | null> {
  await connection();
  const { data, error } = await db().rpc("subscription_context", { p_subscription_id: subscriptionId });
  if (error) throw error;
  return (data as SubscriptionContext | null) ?? null;
}

/** Whether an email subscription belongs to the device that posted its wish. */
export async function isWisherSubscription(subscriptionId: number): Promise<boolean> {
  const { data, error } = await db()
    .from("subscriptions")
    .select("device_id, wish:wishes!inner(device_id)")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  const wish = data?.wish as { device_id: number } | { device_id: number }[] | undefined;
  const wishDevice = Array.isArray(wish) ? wish[0]?.device_id : wish?.device_id;
  return data != null && wishDevice === data.device_id;
}

/** Overlays live me-too counts onto cached wishes. */
export function withLiveCounts<T extends { id: number; metoo_count: number }>(wishes: T[], live: LiveMetoos): T[] {
  return wishes.map((w) => {
    const count = live.counts.get(w.id);
    return count === undefined || count === w.metoo_count ? w : { ...w, metoo_count: count };
  });
}

export async function getSitemapEntries(): Promise<{ wishes: { id: number; updated_at: string }[]; developers: string[] }> {
  "use cache";
  cacheLife("hours");

  const { data, error } = await db().rpc("sitemap_entries");
  if (error) throw error;
  return data as { wishes: { id: number; updated_at: string }[]; developers: string[] };
}
