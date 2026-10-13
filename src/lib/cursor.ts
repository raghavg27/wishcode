// Opaque keyset cursors for the ledger feed.

import type { Sort } from "./config";
import type { WishCard } from "./types";

export type Cursor = { id: number; ts?: string; count?: number };

export function encodeCursor(sort: Sort, last: WishCard): string {
  const c: Cursor = sort === "top" ? { id: last.id, count: last.metoo_count } : { id: last.id, ts: last.created_at };
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(sort: Sort, raw: string | null | undefined): Cursor | null {
  if (!raw || raw.length > 200) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Cursor;
    if (!Number.isSafeInteger(c.id) || c.id <= 0) return null;
    if (sort === "top") return Number.isSafeInteger(c.count) && c.count! >= 0 ? { id: c.id, count: c.count } : null;
    return typeof c.ts === "string" && !Number.isNaN(Date.parse(c.ts)) ? { id: c.id, ts: c.ts } : null;
  } catch {
    return null;
  }
}
