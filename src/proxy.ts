import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MISSING_HEADER, pageExists, shareTargetExists, type MissingKind } from "@/lib/page-exists";
import { GITHUB_HANDLE, parseWishId } from "@/lib/site";

// /w/:id, and its share URLs /w/:id/by/:handle and /w/:id/came-true.
const WISH_PATH = /^\/w\/([^/]+)(?:\/by\/([^/]+)|\/(came-true))?\/?$/;
const DEVELOPER_PATH = /^\/d\/([^/]+)\/?$/;
const UNSUBSCRIBE_PATH = /^\/e\/unsubscribe\/?$/;

export async function proxy(request: NextRequest) {
  // One-click unsubscribe (RFC 8058) POSTs to the page's URL. A page can't
  // also be a route handler, so send POSTs that aren't Server Actions to one.
  if (
    request.method === "POST" &&
    UNSUBSCRIBE_PATH.test(request.nextUrl.pathname) &&
    !request.headers.has("next-action")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/unsubscribe";
    return NextResponse.rewrite(url);
  }

  const missing = await missingPage(request);
  if (missing) {
    // Pages stream, so their status is committed before they can call
    // notFound(). Rewriting to a path no route matches gets a real 404.
    const headers = new Headers(request.headers);
    headers.set(MISSING_HEADER, missing);
    return NextResponse.rewrite(new URL("/_missing", request.url), { request: { headers } });
  }
  return refreshSession(request);
}

/**
 * For full-page loads of /w/:id (and its share URLs) and /d/:handle, which
 * kind of page is missing, if any. Client navigations (RSC requests) skip
 * this: they render the route's not-found UI and have no status code to fix.
 */
async function missingPage(request: NextRequest): Promise<MissingKind | null> {
  if (request.method !== "GET" || request.headers.has("rsc")) return null;
  const path = request.nextUrl.pathname;

  const wish = WISH_PATH.exec(path);
  if (wish) {
    const id = parseWishId(decodeSegment(wish[1]));
    if (!id || !(await pageExists({ wishId: id }))) return "wish";
    const target = wish[3] ? "came-true" : wish[2] !== undefined ? { by: decodeSegment(wish[2]) } : null;
    return target && !(await shareTargetExists(id, target)) ? "share" : null;
  }

  const dev = DEVELOPER_PATH.exec(path);
  if (dev) {
    const handle = decodeSegment(dev[1]);
    return GITHUB_HANDLE.test(handle) && (await pageExists({ handle })) ? null : "developer";
  }
  return null;
}

function decodeSegment(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}

// Keeps Supabase Auth sessions fresh. Only developers have sessions, so the
// common anonymous request skips the auth round-trip entirely.
async function refreshSession(request: NextRequest) {
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
