import { NextResponse, type NextRequest } from "next/server";
import { upsertDeveloper } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";
import { createAuthClient } from "@/lib/supabase/server";

// GitHub OAuth (PKCE) lands here. Exchanges the code for a session cookie and
// creates or refreshes the developer's public profile row.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}&next=${encodeURIComponent(next)}`, request.url), 303);

  if (searchParams.get("error")) return fail("denied");
  if (!code) return fail("missing_code");

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth] exchangeCodeForSession failed", error);
    return fail("exchange");
  }

  try {
    const developer = await upsertDeveloper(data.user.id, data.user.user_metadata);
    if (!developer) {
      await supabase.auth.signOut();
      return fail("not_github");
    }
  } catch (err) {
    console.error("[auth] upsert developer failed", err);
    // The session is valid; getViewer() retries the upsert on the next request.
  }

  return NextResponse.redirect(new URL(next, request.url), 303);
}
