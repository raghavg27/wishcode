import { createHmac, timingSafeEqual } from "node:crypto";

// Links in emails carry `t = <subscriptionId>.<sig>`, where sig is an
// HMAC-SHA256 of the id. Nothing is stored: the token is rebuilt for every
// email and checked in constant time before any RPC runs.

const TOKEN_PATTERN = /^([1-9][0-9]{0,15})\.([A-Za-z0-9_-]{43})$/;

function sign(subscriptionId: number, secret: string): string {
  return createHmac("sha256", secret).update(`sub:${subscriptionId}`).digest("base64url");
}

export function signEmailToken(subscriptionId: number, secret: string): string {
  return `${subscriptionId}.${sign(subscriptionId, secret)}`;
}

/** The subscription id the token was signed for, or null if it's invalid. */
export function verifyEmailToken(token: unknown, secret: string): number | null {
  if (typeof token !== "string") return null;
  const match = TOKEN_PATTERN.exec(token);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id)) return null;
  const expected = Buffer.from(sign(id, secret));
  const actual = Buffer.from(match[2]);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}
