import "server-only";
import { db } from "@/lib/supabase/admin";

/** Request header the root not-found page reads to pick its copy. */
export const MISSING_HEADER = "x-wishcode-missing";
export type MissingKind = "wish" | "developer";

// Per-instance memo of pages known to exist, so the proxy's lookup runs about
// once per page per server instance. Wishes are never hard-deleted; handles
// can be renamed, so entries expire. Misses are not memoised because a new
// wish or developer can appear at any moment.
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 10_000;
const known = new Map<string, number>();

/**
 * Whether /w/:id or /d/:handle has something to show (removed wishes count).
 * Fails open: if the lookup errors, the page renders and handles it itself.
 */
export async function pageExists(target: { wishId: number } | { handle: string }): Promise<boolean> {
  const key = "wishId" in target ? `w:${target.wishId}` : `d:${target.handle.toLowerCase()}`;
  const seen = known.get(key);
  if (seen && seen > Date.now()) return true;

  const { data, error } = await db().rpc("page_exists", {
    p_wish_id: "wishId" in target ? target.wishId : null,
    p_handle: "handle" in target ? target.handle : null,
  });
  if (error) {
    console.error("[page_exists]", error);
    return true;
  }
  if (data !== true) return false;

  if (known.size >= MAX_ENTRIES) known.delete(known.keys().next().value!);
  known.set(key, Date.now() + TTL_MS);
  return true;
}
