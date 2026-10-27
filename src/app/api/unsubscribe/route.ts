import type { NextRequest } from "next/server";
import { verifyEmailToken, verifyLinkToken } from "@/lib/email-token";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";

// RFC 8058 one-click unsubscribe. Mail clients POST to the List-Unsubscribe
// URL (/e/unsubscribe?t=…); src/proxy.ts rewrites those POSTs here because
// that path is also a page. The page's form also lands here when JavaScript
// is off, so `all=1` is honoured; the List-Unsubscribe URL never has it.
// Developer emails carry `d` (a link token) and always stop all email.
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.has("d")) return stopDeveloper(params.get("d"));
  const subscriptionId = verifyEmailToken(params.get("t"), env.emailTokenSecret);
  if (!subscriptionId) return new Response("This link has expired or does not work.", { status: 400 });
  const all = params.get("all") === "1";

  const { error } = await db().rpc("unsubscribe", { p_subscription_id: subscriptionId, p_all: all });
  if (error) {
    if (error.message === "not_found") return new Response("This link has expired or does not work.", { status: 400 });
    console.error("[unsubscribe] one-click failed", { subscriptionId, code: error.code });
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
  return new Response(all ? "You will not get any more Wishcode emails." : "You will not get more emails about this wish.", {
    status: 200,
  });
}

async function stopDeveloper(token: string | null) {
  const linkId = verifyLinkToken(token, env.emailTokenSecret);
  if (!linkId) return new Response("This link has expired or does not work.", { status: 400 });

  const { error } = await db().rpc("suppress_developer_email", { p_link_id: linkId });
  if (error) {
    if (error.message === "not_found") return new Response("This link has expired or does not work.", { status: 400 });
    console.error("[unsubscribe] developer one-click failed", { linkId, code: error.code });
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
  return new Response("You will not get any more Wishcode emails.", { status: 200 });
}
