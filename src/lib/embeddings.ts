import "server-only";
import { env } from "@/lib/env";

const DIMENSIONS = 1536;

/**
 * Embeds a wish for duplicate suggestions (TRD 2.5). Returns null when no
 * provider is configured or the call fails; posting must never depend on it,
 * and the database falls back to trigram similarity.
 */
export async function embed(text: string): Promise<number[] | null> {
  const { apiKey, baseUrl, model } = env.embeddings;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: text, dimensions: DIMENSIONS }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[embeddings] provider error", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const json = (await res.json()) as { data?: { embedding?: number[] }[] };
    const vector = json.data?.[0]?.embedding;
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
