# Wishcode

A public ledger of software wishes. Anyone posts a one-sentence wish without signing up; developers connect GitHub to claim a wish or post a live link that fulfils it. Spec: `Wishcode — v1 PRD, TRD & App Flow.md`. Design: `design/`.

**Stack:** Next.js 16 (App Router, Cache Components, Server Actions) · TypeScript · Tailwind v4 · Supabase (Postgres + pgvector + GitHub auth) · Vercel.

## Setup

### 1. Database

The Supabase project starts empty. Apply the migrations in `supabase/migrations/` in filename order:

- **SQL editor:** paste each file into Supabase → SQL Editor and run it, oldest first, **or**
- **CLI:** `supabase link --project-ref <ref> && supabase db push`.

They enable `vector` and `pg_trgm`, creates the tables, triggers and functions, and revokes all access from `anon`/`authenticated`.

### 2. GitHub sign-in (developers only)

1. GitHub → Settings → Developer settings → OAuth Apps → New. Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers → GitHub: enable it and paste the client ID and secret.
3. Supabase → Authentication → URL Configuration: set **Site URL** to your production URL and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Optional: disable the Email provider. Nothing in the app uses it.

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in. You need **`SUPABASE_SECRET_KEY`** (Project Settings → API Keys → Secret key). The server uses it for every database call, because the browser never gets database access.

### 3b. Duplicate-suggestion embeddings (optional, free)

Duplicate suggestions work without this, using Postgres trigram matching. For matching on meaning ("mute my mic when the dog barks" ≈ "silence my microphone on barking"), deploy the `embed` Edge Function. It runs Supabase's built-in `gte-small` model, which has no model fee; it only uses the function's normal CPU time.

```bash
supabase link --project-ref <ref>
supabase functions deploy embed --no-verify-jwt   # the function checks the secret key itself
```

In the dashboard instead: Edge Functions → Deploy a new function → name it `embed`, paste `supabase/functions/embed/index.ts`, and turn off **Verify JWT**.

Then set `EMBEDDINGS_FUNCTION=embed` (locally and in Vercel) and embed the existing wishes. Repeat until `"remaining": false`:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/embed" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"backfill": true, "limit": 50}'
```

Wishes posted while the function was cold or down are saved without an embedding. Duplicate checks still find them by trigram matching, and the same backfill call embeds them later.

### 3c. Email notifications (optional, Gmail)

The wisher and people who me-too'd can leave an email to hear when someone posts a live link. Emails go out over Gmail SMTP. Without credentials nothing is sent (the server logs that once), so dev and previews work as is.

1. Use a Google account for Wishcode's mail and turn on **2-Step Verification** (Google Account → Security).
2. Google Account → Security → **App passwords** → create one named "Wishcode". Copy the 16-character password.
3. Set `GMAIL_USER` (the address) and `GMAIL_APP_PASSWORD` locally and in Vercel. Emails come from `"Wishcode" <GMAIL_USER>`.
4. Optional: set `EMAIL_TOKEN_SECRET` to a long random string. It signs the vote and unsubscribe links in emails and defaults to `SUPABASE_SECRET_KEY`. Changing it invalidates links in emails already sent.

Gmail allows about 500 recipients a day (about 2,000 on Workspace). Sends past that fail and are logged as `[notify] send failed` with the subscription id; there are no retries.

Email links land on `/e/verdict` (confirm a Yes / No vote) and `/e/unsubscribe` (stop emails for one wish, or `&all=1` for all). Opening them changes nothing, since mail scanners open every link; the button on the page does. Mail clients' one-click unsubscribe (`List-Unsubscribe-Post`) POSTs to `/e/unsubscribe`, which `src/proxy.ts` routes to `/api/unsubscribe`.

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
- **Integrity in the database.** Status (`open` → `being_built` → `fulfilled`, and back when links or claims are removed or links are flagged), `verified`, `metoo_count`, `claim_count`, `link_count` and `live_link_count` are maintained by triggers with row locks. They stay correct under concurrency and for any write path. Partial unique indexes enforce one me-too per device per wish and one live link per developer per wish.
- **Verdicts.** The wisher and devices that me-too'd a wish vote on whether each link works (`verdicts`). A trigger recomputes the link's `verdict`: the wisher's vote decides, otherwise 3 votes verify or flag it (a tie flags). Status counts only live (not flagged) links; `wishes.verified` drives the **Fulfilled ✓** vs **Fulfilled · unverified** badge. Taking back a me-too deletes that device's votes and ends its email subscription.
- **Emails.** `postLink` schedules `notifyLinkPosted` with `after()`, so it runs once the response is sent. It reads recipients from `link_notification` (the only function that returns addresses), builds each email with `buildLinkEmail` and sends them one by one through `src/lib/mailer.ts`. Links in emails carry `<subscriptionId>.<HMAC>`; nothing is stored for them.
- **Rate limits** are atomic fixed-window counters inside the same transaction as the write. Daily windows reset at midnight UTC: 2 wishes and 100 me-toos per device, 20 wishes and 1,000 me-toos per network (salted IP hash; shared IPs get a looser backstop), 5 claims and 20 links per developer, and 20 new email subscriptions per device (100 per network). Duplicate checks are capped at 60 per IP per hour. Values live in `LIMITS` in `src/lib/config.ts`. An over-limit write rolls back completely.
- **Duplicate suggestions.** The `embed` Edge Function returns a 384-dim `gte-small` embedding (4 s timeout), matched against an HNSW index at cosine ≥ 0.89. Wishes without an embedding yet are matched by `pg_trgm`. If the function isn't configured or fails, matching falls back to `pg_trgm` entirely, and posting is never blocked. Embedding calls are capped per IP.
- **Caching.** Public reads (feed pages, wish detail, stats, profiles) use `"use cache"` with tags. Writes call `updateTag`, so wishes, claims, links and the sidebar stats show up immediately. Me-toos don't invalidate the feed or wish caches. Instead, every page reads its wishes' current counts and the viewer's own me-toos in one uncached primary-key lookup (`live_metoos`) and overlays them, so counts are live while the cached entries stay warm. Pages are partially prerendered: the static shell is served instantly and data streams in.
- **404s.** Because pages stream, their status is committed before they can call `notFound()`. `src/proxy.ts` checks `/w/:id` and `/d/:handle` page loads against `page_exists` (memoised per instance) and rewrites misses to an unmatched path, so they return a real 404 with the right copy.
- **Share cards.** `/api/og/wish/:id` renders 1200×630 PNGs with bundled fonts. The page links them with a `?v=` that changes with status, link count and me-toos, so they can be CDN-cached for a day.
- **Security headers:** `frame-ancestors 'none'`, nosniff, HSTS, a strict referrer policy and permissions policy. External links use `target="_blank" rel="noopener noreferrer nofollow ugc"` and are never iframed. Post-login redirects accept same-site paths only.

## API

Mutations are Server Actions (`src/app/actions.ts`): `postWish`, `setMetoo`, `setClaim`, `postLink`, `removeLink`, `setVerdict`, `subscribe`, and, from email links, `emailVerdict` and `unsubscribe`. Next.js enforces same-origin requests for them. Public JSON endpoints:

| Route | Purpose |
| --- | --- |
| `GET /api/wishes?status=&sort=&cursor=` | Cursor-paginated feed with live me-too counts (plus the viewer's me-toos) |
| `GET /api/wishes/:id` | Wish with claims and links |
| `GET /api/developers/:handle` | Developer profile |
| `GET /api/og/wish/:id` | Share card PNG |
| `POST /e/unsubscribe?t=` | RFC 8058 one-click unsubscribe (handled by `/api/unsubscribe`) |

## Not built yet

The admin screens (`/admin`) are deferred. The database side exists already: `admin_delete_wish` and admin link removal via `remove_link`, gated by `developers.is_admin`, which is set from `ADMIN_GITHUB_HANDLES` on sign-in.
