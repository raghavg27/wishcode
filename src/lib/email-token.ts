import { createHmac, timingSafeEqual } from "node:crypto";

// Links in emails carry `t = <id>.<sig>`, where sig is an HMAC-SHA256 of the
// id and what it identifies: a subscription (`sub:`), or for developer emails
// a link (`link:`), so one can't stand in for the other. Nothing is stored:
// the token is rebuilt for every email and checked in constant time before
// any RPC runs.

type Scope = "sub" | "link";

const TOKEN_PATTERN = /^([1-9][0-9]{0,15})\.([A-Za-z0-9_-]{43})$/;

function sign(scope: Scope, id: number, secret: string): string {
  return createHmac("sha256", secret).update(`${scope}:${id}`).digest("base64url");
}

function verify(scope: Scope, token: unknown, secret: string): number | null {
  if (typeof token !== "string") return null;
  const match = TOKEN_PATTERN.exec(token);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id)) return null;
  const expected = Buffer.from(sign(scope, id, secret));
  const actual = Buffer.from(match[2]);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}

export function signEmailToken(subscriptionId: number, secret: string): string {
  return `${subscriptionId}.${sign("sub", subscriptionId, secret)}`;
}

/** The subscription id the token was signed for, or null if it's invalid. */
export function verifyEmailToken(token: unknown, secret: string): number | null {
  return verify("sub", token, secret);
}

/** A developer email's token: identifies the link it was sent about. */
export function signLinkToken(linkId: number, secret: string): string {
  return `${linkId}.${sign("link", linkId, secret)}`;
}

/** The link id the token was signed for, or null if it's invalid. */
export function verifyLinkToken(token: unknown, secret: string): number | null {
  return verify("link", token, secret);
}
