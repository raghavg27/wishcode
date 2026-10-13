# Supabase in Wishcode

How this app wires up Supabase. It follows Supabase's Next.js SSR setup, adapted for Next.js 16: **`middleware.ts` is now `proxy.ts`**, the exported function is `proxy`, and it runs on the Node.js runtime by default.

## 1. Packages

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

## 2. Environment

All server-only. Nothing is `NEXT_PUBLIC_`, because the browser never talks to Supabase directly.

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # Supabase Auth only
SUPABASE_SECRET_KEY=sb_secret_...             # every database call
```

See `.env.example` for the optional variables.

## 3. Clients

| File | Key | Used for |
| --- | --- | --- |
| `src/lib/supabase/server.ts` → `createAuthClient()` | publishable | Supabase Auth (GitHub sign-in, reading the session) in Server Components, Server Actions and route handlers. Bound to the request cookies. |
| `src/lib/supabase/admin.ts` → `db()` | secret | All reads and writes, through SQL functions only `service_role` can execute. Called after the server has checked the device cookie or the developer session. |

There is no browser client (`createBrowserClient`). Writes are Server Actions in `src/app/actions.ts`.

`createAuthClient()`'s `setAll` swallows the error thrown when a Server Component tries to set cookies. That's safe because the proxy refreshes sessions.

## 4. Proxy (formerly middleware)

`src/proxy.ts` replaces the `utils/supabase/middleware.ts` + `middleware.ts` pair from Supabase's guide:

```ts
// src/proxy.ts (abridged)
export async function proxy(request: NextRequest) {
  // ...404 check for unknown /w/:id and /d/:handle, see below...
  return refreshSession(request);
}

async function refreshSession(request: NextRequest) {
  // Anonymous visitors have no sb-* cookie: skip the auth round-trip.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims(); // validates the JWT, refreshes it near expiry
  return response;
}
```

Differences from the Supabase quickstart:

- File and export are `proxy`, not `middleware`. `export const runtime` is not allowed in a proxy file.
- It calls `auth.getClaims()`. The quickstart's helper builds the client but never calls anything, so it never actually refreshes the session.
- It skips Supabase entirely for requests without an `sb-` cookie, which is every wisher.
- It also gives unknown wish and developer URLs a real 404. Pages stream, so their status is fixed before they can call `notFound()`. The proxy checks `page_exists` first (memoised per instance) and rewrites misses to an unmatched path.

## 5. Edge Function: `embed`

`supabase/functions/embed/index.ts` turns wish text into a 384-dim vector with the Edge Runtime's built-in `gte-small` model (`new Supabase.ai.Session('gte-small')`, mean-pooled and normalised). It has no model fee and only uses the function's normal CPU time.

- **Auth:** deployed with JWT verification off. It uses `withSupabase({ auth: 'secret:*' })` from `npm:@supabase/server@1.8.1`, which accepts any of the project's secret keys in the `apikey` header. The Next.js server sends `SUPABASE_SECRET_KEY`, which needn't be the key named `default`.
- **Calls:** `{ "input": "…" }` returns `{ "embedding": [...] }`. `{ "backfill": true, "limit": 50 }` embeds wishes that have none yet.
- **App side:** `src/lib/embeddings.ts`, enabled by `EMBEDDINGS_FUNCTION=embed`.

Setup steps are in the README under "Duplicate-suggestion embeddings".

## 6. Database

Migrations live in `supabase/migrations/` and are applied in filename order (SQL editor, or `supabase db push`). Every table has RLS on with no policies, and `anon`/`authenticated` have no grants. Only `service_role` can execute the functions. Smoke test: `SCRATCH_DB_URL=postgres://… pnpm db:test`.
