# Wishcode

A public ledger of software wishes. Anyone posts a one-sentence wish without signing up; developers connect GitHub to claim a wish or post a live link that fulfils it. Spec: `Wishcode — v1 PRD, TRD & App Flow.md`. Design: `design/`.

**Stack:** Next.js 16 (App Router, Cache Components, Server Actions) · TypeScript · Tailwind v4 · Supabase (Postgres + pgvector + GitHub auth) · Vercel.

## Setup

### 1. Database

The Supabase project starts empty. Apply the migration once:

- **SQL editor:** paste `supabase/migrations/20261013000000_init.sql` into Supabase → SQL Editor and run it, **or**
- **CLI:** `supabase link --project-ref <ref> && supabase db push`.

It enables `vector` and `pg_trgm`, creates the tables, triggers and functions, and revokes all access from `anon`/`authenticated`.

### 2. GitHub sign-in (developers only)

1. GitHub → Settings → Developer settings → OAuth Apps → New. Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers → GitHub: enable it and paste the client ID and secret.
3. Supabase → Authentication → URL Configuration: set **Site URL** to your production URL and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Optional: disable the Email provider. Nothing in the app uses it.

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in. You need **`SUPABASE_SECRET_KEY`** (Project Settings → API Keys → Secret key). The server uses it for every database call, because the browser never gets database access.

### 4. Run

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # unit tests (vitest)
pnpm lint && pnpm typecheck
pnpm build          # production build (needs the env vars; prerenders public data)
```

To test the database, apply the migration to a scratch Postgres that has pgvector, then run `SCRATCH_DB_URL=postgres://… pnpm db:test`. It runs `supabase/tests/smoke.sql`, which checks state transitions, counters, rate limits and privileges inside a rolled-back transaction.

### 5. Deploy (Vercel)

Add the same env vars in Vercel (none are `NEXT_PUBLIC_`, so all can be marked Sensitive) and deploy. `SITE_URL` is optional there: it defaults to the production domain, so set it only for a custom domain. The build reads the database (sitemap and the ledger's static shell), so the env vars must be available at build time too.

## Architecture

```
Browser ──(Server Actions / GET)──▶ Next.js on Vercel ──(service role, RPC only)──▶ Supabase Postgres
   │                                     │                                          (RLS on, no policies,
   └── Supabase Auth (GitHub OAuth) ◀────┘ session cookie verified with getClaims()    anon has no grants)
```

- **No direct DB access from browsers.** Every table has RLS enabled with no policies, and `anon`/`authenticated` hold no privileges. All reads and writes go through SQL functions that only `service_role` may execute. The Next.js server calls them after it verifies the device cookie or the GitHub session. The publishable key is used only for Supabase Auth.
- **Anonymous identity.** A random 256-bit token sits in an httpOnly `wc_device` cookie and is minted lazily on the first write, so read-only visits stay cacheable. Only its SHA-256 is stored.
- **Integrity in the database.** Status (`open` → `being_built` → `fulfilled`, and back when links or claims are removed), `metoo_count`, `claim_count` and `link_count` are maintained by triggers with row-locked increments. They stay correct under concurrency and for any write path. Partial unique indexes enforce one me-too per device per wish and one live link per developer per wish.
- **Rate limits** (PRD F10) are atomic fixed-window counters (UTC day) inside the same transaction as the write: 5 wishes and 200 me-toos per device, and 20 links per developer. Generous per-IP ceilings back them up (IPs are salted-hashed and expire with the window). An over-limit write rolls back completely.
- **Duplicate suggestions.** Embeddings (1536-dim, OpenAI-compatible, 4 s timeout) are matched against an HNSW index at cosine ≥ 0.88. Without an embeddings key, or if the provider fails, matching falls back to `pg_trgm`, and posting is never blocked. Embedding calls are capped per IP.
- **Caching.** Public reads (feed pages, wish detail, stats, profiles) use `"use cache"` with short lifetimes and tags. Writes call `updateTag` for read-your-own-writes; me-toos use stale-while-revalidate so popular wishes don't thrash the cache. Per-viewer state (your me-toos, your session) is read per request behind `<Suspense>`. Pages are partially prerendered: the static shell is served instantly and data streams in.
- **Share cards.** `/api/og/wish/:id` renders 1200×630 PNGs with bundled fonts. The page links them with a `?v=` that changes with status, link count and me-toos, so they can be CDN-cached for a day.
- **Security headers:** `frame-ancestors 'none'`, nosniff, HSTS, a strict referrer policy and permissions policy. External links use `target="_blank" rel="noopener noreferrer nofollow ugc"` and are never iframed. Post-login redirects accept same-site paths only.

## API

Mutations are Server Actions (`src/app/actions.ts`): `postWish`, `setMetoo`, `setClaim`, `postLink`, `removeLink`. Next.js enforces same-origin requests for them. Public JSON endpoints:

| Route | Purpose |
| --- | --- |
| `GET /api/wishes?status=&sort=&cursor=` | Cursor-paginated feed (plus the viewer's me-toos) |
| `GET /api/wishes/:id` | Wish with claims and links |
| `GET /api/developers/:handle` | Developer profile |
| `GET /api/og/wish/:id` | Share card PNG |

## Not built yet

The admin screens (`/admin`) are deferred. The database side exists already: `admin_delete_wish` and admin link removal via `remove_link`, gated by `developers.is_admin`, which is set from `ADMIN_GITHUB_HANDLES` on sign-in.
