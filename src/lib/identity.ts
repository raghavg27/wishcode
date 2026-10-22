import "server-only";
import { cookies, headers } from "next/headers";
import { env } from "@/lib/env";

// Anonymous identity (TRD 2.7): a random token in an httpOnly cookie; only
// its SHA-256 hash is stored. The cookie is minted lazily on the first write
// so read-only visits never carry Set-Cookie and stay cacheable.

const DEVICE_COOKIE = "wc_device";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

/** Hash of the current device token, or null if this browser has none yet. */
export async function readDeviceHash(): Promise<string | null> {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  return token && TOKEN_PATTERN.test(token) ? sha256Hex(token) : null;
}

/** Hash of the device token, minting the cookie if needed. Server Actions only. */
export async function ensureDeviceHash(): Promise<string> {
  const store = await cookies();
  let token = store.get(DEVICE_COOKIE)?.value;
  if (!token || !TOKEN_PATTERN.test(token)) {
    token = randomToken();
    store.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  }
  return sha256Hex(token);
}

/**
 * Salted hash of the client IP, used only as a rate-limit key that expires
 * within a day. The raw IP is never stored. Trusts X-Forwarded-For, which
 * Vercel overwrites with the client IP; behind any other proxy, make sure it
 * does the same, or clients can pick their own rate-limit key.
 */
export async function clientIpKey(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  if (!ip) return null;
  return (await sha256Hex(`${env.rateLimitSalt}:${ip}`)).slice(0, 32);
}
