// The live visitor count in the header: every open browser joins one Supabase
// Realtime Presence channel, and the header shows how many are in it.

export const PRESENCE_CHANNEL = "online";
/** Below this the badge stays hidden, so nobody sees themselves counted alone. */
export const MIN_VISIBLE = 2;
/** A tab hidden this long stops counting until it's visible again. */
export const HIDDEN_GRACE_MS = 60_000;

const VISITOR_KEY = "wishcode:visitor";

/** Distinct visitors in a presence state. Tabs of one browser share a key. */
export function visitorCount(state: Record<string, unknown[]>) {
  return Object.values(state).filter((metas) => metas.length > 0).length;
}

/** The number to show, or null when the badge should be hidden. */
export function badgeCount(state: Record<string, unknown[]>) {
  const count = visitorCount(state);
  return count >= MIN_VISIBLE ? count : null;
}

/** A random id per browser, so several tabs count as one visitor. */
export function visitorId() {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Private mode or storage disabled: this tab counts on its own.
    return crypto.randomUUID();
  }
}
