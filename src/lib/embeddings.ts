import "server-only";
import { env } from "@/lib/env";

/** gte-small output size; matches wishes.embedding vector(384). */
const DIMENSIONS = 384;

/**
 * Embeds a wish for duplicate suggestions via the `embed` Edge Function
 * (Supabase's built-in gte-small model, no model fee). Returns null when the
 * function isn't configured or the call fails; posting must never depend on
 * it, and the database falls back to trigram similarity.
 */
export async function embed(text: string): Promise<number[] | null> {
  const fn = env.embeddingsFunction;
  if (!fn) return null;

  try {
    const res = await fetch(`${env.supabaseUrl.replace(/\/$/, "")}/functions/v1/${encodeURIComponent(fn)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.supabaseSecretKey },
      body: JSON.stringify({ input: text }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[embeddings] function error", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const json = (await res.json()) as { embedding?: number[] };
    const vector = json.embedding;
    if (!Array.isArray(vector) || vector.length !== DIMENSIONS) {
      console.error("[embeddings] unexpected response shape");
      return null;
    }
    return vector;
  } catch (err) {
    console.error("[embeddings] request failed", err instanceof Error ? err.message : err);
    return null;
  }
}
