import "server-only";
import { env } from "@/lib/env";

// Cloudflare Turnstile: the bot check on posting a wish. Off unless
// TURNSTILE_SECRET_KEY is set (dev, previews and tests post freely).

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled(): boolean {
  return Boolean(env.turnstileSecretKey);
}

/**
 * Checks a token with Cloudflare. Tokens are single-use and last 5 minutes.
 * A token Cloudflare rejects always fails; if Cloudflare can't be reached,
 * this fails open so an outage there never stops people posting.
 */
export async function verifyTurnstile(token: string, action: string): Promise<boolean> {
  const secret = env.turnstileSecretKey;
  if (!secret) return true;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[turnstile] siteverify unavailable", res.status);
      return true;
    }
    const data = (await res.json()) as { success?: boolean; action?: string; "error-codes"?: string[] };
    if (!data.success) {
      const codes = data["error-codes"] ?? [];
      // A bad secret blocks every post: make it loud.
      const log = codes.some((c) => c.includes("secret")) ? console.error : console.warn;
      log("[turnstile] token rejected", codes);
      return false;
    }
    return !data.action || data.action === action;
  } catch (err) {
    console.error("[turnstile] siteverify failed", err instanceof Error ? err.message : err);
    return true;
  }
}
