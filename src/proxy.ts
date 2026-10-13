import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps Supabase Auth sessions fresh. Only developers have sessions, so the
// common anonymous request skips the auth round-trip entirely.
export async function proxy(request: NextRequest) {
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!hasAuthCookie || !url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Validates the JWT and refreshes it when close to expiry.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/og|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
