# Self-hosting Wishcode

This document tells you how to run your own copy of Wishcode. It also tells you how the system operates. For an overview of the product, see the [README](README.md).

> [!NOTE]
> The Wishcode name and logo are not part of the MIT license. If you deploy your own copy, use a different name and logo.

## Technology stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components, Server Actions), React 19 |
| Language | TypeScript 5 |
| Styles | Tailwind CSS v4 |
| Database | [Supabase](https://supabase.com) Postgres with `pgvector` and `pg_trgm` |
| Authentication | Supabase Auth with GitHub OAuth (developers only) |
| Embeddings | Supabase Edge Function with the built-in `gte-small` model |
| Email | Gmail SMTP through Nodemailer |
| Bot check | [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) |
| Analytics | [PostHog](https://posthog.com) |
| Error tracking | [Sentry](https://sentry.io) |
| Landing page | three.js, GSAP and Lenis |
| Tests | Vitest and an SQL smoke test |
| Hosting | [Vercel](https://vercel.com) |

## Quick start

### Prerequisites

You must have these items:

- Node.js 20.9 or a later version
- pnpm 10
- A [Supabase](https://supabase.com) project
- A GitHub account (for the OAuth app)

The [Supabase CLI](https://supabase.com/docs/guides/cli) is not necessary, but it makes steps 2 and 6 faster.

### Step 1: Clone the repository

1. Clone the repository:

   ```bash
   git clone https://github.com/raghavg27/wishcode.git
   cd wishcode
   ```

2. Install the dependencies:

   ```bash
   pnpm install
   ```

### Step 2: Set up the database

A new Supabase project has no tables. The migrations in `supabase/migrations/` make the full schema.

1. Apply the migrations in filename order, from the oldest to the newest. Use one of these two methods:
   - **SQL editor:** In Supabase, open **SQL Editor**. Paste each file and run it.
   - **CLI:** Run this command:

     ```bash
     supabase link --project-ref <project-ref>
     supabase db push
     ```

The migrations do these tasks:

- They add the `vector` and `pg_trgm` extensions.
- They make the tables, triggers and functions.
- They remove all access from the `anon` and `authenticated` roles.

### Step 3: Set up GitHub sign-in

Only developers sign in. Wishers and me-too visitors do not sign in.

1. In GitHub, go to **Settings → Developer settings → OAuth Apps**. Click **New OAuth App**.
2. Set the callback URL to `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase, go to **Authentication → Sign In / Providers → GitHub**. Click **Enable**.
4. Paste the client ID and the client secret from GitHub.
5. In Supabase, go to **Authentication → URL Configuration**.
6. Set **Site URL** to your production URL.
7. Add these two entries to **Redirect URLs**:

   ```
   https://<your-domain>/auth/callback**
   http://localhost:*/auth/callback**
   ```

> [!IMPORTANT]
> Keep the `**` at the end of each redirect URL. The callback has a `?next=…` query, and Supabase compares the full URL. If the URL does not agree with an entry, Supabase sends the user to the Site URL. Then the user lands on `/?code=…` and is not signed in.

8. Disable the Email provider and **Allow anonymous sign-ins**. The app does not use them. Only accounts with a GitHub identity become developers, but do not keep other sign-in methods open.

### Step 4: Set the environment variables

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local`. Write the values for `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.

   You find the keys in Supabase, at **Project Settings → API Keys**.

> [!CAUTION]
> Do not commit `SUPABASE_SECRET_KEY` and do not send it to the browser. This key has full access to the database.

For a full list of the variables, see [Configuration](#configuration).

### Step 5: Start the app

1. Start the development server:

   ```bash
   pnpm dev
   ```

2. Open <http://localhost:3000> in your browser.

The app is now ready for use. Steps 6, 7 and 8 add more services. You can do them later.

### Step 6: Add meaning-based duplicate suggestions (not necessary)

Without this step, duplicate suggestions use Postgres trigram matching. Trigram matching finds wishes with similar words. Embeddings also find wishes with the same meaning. For example, "mute my mic when the dog barks" and "silence my microphone on barking" agree.

The `embed` Edge Function uses the `gte-small` model that is built into Supabase. The model is free. The function uses only its usual CPU time.

1. Deploy the function:

   ```bash
   supabase link --project-ref <project-ref>
   supabase functions deploy embed --no-verify-jwt
   ```

   The function examines the secret key itself. Thus, JWT verification is not necessary.

   To use the dashboard instead, go to **Edge Functions → Deploy a new function**. Set the name to `embed`. Paste `supabase/functions/embed/index.ts`. Turn off **Verify JWT**.

2. Set `EMBEDDINGS_FUNCTION=embed` in `.env.local` and in Vercel.
3. Add embeddings to the wishes that you have now:

   ```bash
   curl -X POST "https://<project-ref>.supabase.co/functions/v1/embed" \
     -H "apikey: $SUPABASE_SECRET_KEY" -H "Content-Type: application/json" \
     -d '{"backfill": true, "limit": 50}'
   ```

4. Do step 3 again until the response shows `"remaining": false`.

> [!NOTE]
> If the function is cold or does not operate, Wishcode saves the wish without an embedding. Trigram matching still finds that wish. The backfill command in step 3 adds the embedding later.

### Step 7: Add email notifications (not necessary)

Wishcode sends emails through Gmail SMTP. If you do not set the Gmail values, the server sends no email. It writes one log message about this. Development and preview deployments operate correctly without email.

1. Select a Google account for Wishcode email.
2. In that account, go to **Google Account → Security**. Turn on **2-Step Verification**.
3. Go to **Security → App passwords**. Make a new app password with the name "Wishcode".
4. Copy the 16-character password.
5. Set `GMAIL_USER` to the email address. Do this in `.env.local` and in Vercel.
6. Set `GMAIL_APP_PASSWORD` to the app password. Do this in `.env.local` and in Vercel.
7. Set `EMAIL_TOKEN_SECRET` to a long random string. This step is not necessary. The default value is `SUPABASE_SECRET_KEY`.

> [!WARNING]
> If you change `EMAIL_TOKEN_SECRET`, the vote links and unsubscribe links in all sent emails stop working.

Who receives emails:

- **Wishers and me-too visitors** can give an email address. They receive an email when a developer posts a live link.
- **Developers** receive one email for each link when the votes verify it. The email goes to the address on their GitHub account. Links that the votes verified before migration `20261021000000` do not cause an email.

Limits and behavior:

- Gmail sends to approximately 500 recipients each day. Google Workspace sends to approximately 2,000. If a send fails, the server writes `[notify] send failed` with the subscription ID to the log. The server does not try again.
- Email links open `/e/verdict` (to confirm a Yes or No vote) and `/e/unsubscribe` (to stop emails for one wish, or for all wishes with `&all=1`).
- A link alone changes nothing, because mail scanners open all links. The user must click the button on the page.
- One-click unsubscribe from mail clients (`List-Unsubscribe-Post`) sends a POST to `/e/unsubscribe`. Then `src/proxy.ts` sends it to `/api/unsubscribe`.

### Step 8: Add a bot check (recommended)

Visitors post wishes without an account. Thus, the composer uses [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) to stop bots. Most visitors do not see the check. Cloudflare shows a checkbox only when it has doubts about a visitor.

> [!CAUTION]
> Set the two Turnstile keys, or set no key. If you set only the secret key, the server rejects all wishes.

1. In the Cloudflare dashboard, go to **Turnstile → Add widget**.
2. Add your production domain. To test locally, also add `localhost`.
3. Select the **Invisible** mode or the **Managed** mode.
4. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel.
5. Deploy again. The build puts the site key into the page code, so a new build is necessary.

Behavior:

- Without the keys, posting has no bot check. Development and preview deployments operate correctly without it.
- The server examines the token immediately before it makes the wish. Thus, the "Post mine anyway" retry uses the same token.
- If the server cannot connect to Cloudflare, the check passes. The server writes `[turnstile] siteverify` to the log. A Cloudflare outage does not stop posting.
- For local tests, Cloudflare gives [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) that always pass or always fail.

### Step 9: Add analytics and error tracking (not necessary)

[PostHog](https://posthog.com) counts visitors, where they come from and what they do. [Sentry](https://sentry.io) reports errors from the browser and the server.

> [!CAUTION]
> Wishcode uses PostHog's cookieless mode. Turn it on in the PostHog project, or PostHog drops every event.

1. In PostHog, create a project. Copy the project API key.
2. In the project settings, turn on **cookieless server hash mode**.
3. Set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel. For a PostHog project in the EU, also set `NEXT_PUBLIC_POSTHOG_HOST` to `https://eu.i.posthog.com`.
4. In Sentry, create a Next.js project. Copy the DSN, and set `NEXT_PUBLIC_SENTRY_DSN` in Vercel.
5. For readable stack traces, create a Sentry organization auth token. Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in Vercel.
6. Deploy again. The build puts the keys into the page code, so a new build is necessary.

Behavior:

- PostHog sets no cookies and stores nothing in the browser. It counts unique visitors with a hash of the IP address and browser that changes every day. A visitor who comes back on another day counts again.
- Analytics go to `/relay` on your own domain, and `src/proxy.ts` forwards them to PostHog without the visitor's cookies. Thus, ad blockers do not drop them. Sentry events go to `/monitoring` in the same way.
- Sentry reports only from production builds. `pnpm dev` sends nothing.
- PostHog does not capture errors or record sessions. Errors go to Sentry.

## Configuration

Set these variables in `.env.local` for local development, and in Vercel for deployment. The template is [`.env.example`](.env.example).

| Variable | Necessary | Description |
| --- | :---: | --- |
| `SUPABASE_URL` | Yes | The URL of your Supabase project. |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | The publishable key. Wishcode uses it only for Supabase Auth. |
| `SUPABASE_SECRET_KEY` | Yes | The secret key. The server uses it for all database calls. Keep it on the server. |
| `SITE_URL` | No | The canonical URL for share links, share cards and the OAuth redirect. On Vercel, the default is the production domain. Set it for a custom domain. |
| `EMBEDDINGS_FUNCTION` | No | The name of the embeddings Edge Function. Set it to `embed` after you deploy the function. |
| `GMAIL_USER` | No | The Gmail address that sends the emails. |
| `GMAIL_APP_PASSWORD` | No | The Google app password for `GMAIL_USER`. |
| `EMAIL_TOKEN_SECRET` | No | The key that signs the links in emails. The default is `SUPABASE_SECRET_KEY`. |
| `RATE_LIMIT_SALT` | No | The pepper for the hash of client IP addresses. The default is `SUPABASE_SECRET_KEY`. |
| `ADMIN_GITHUB_IDS` | No | A comma-separated list of numeric GitHub user IDs. These developers receive admin rights when they sign in. To find an ID, open `https://api.github.com/users/<handle>` and use the `id` value. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | The public Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET_KEY` | No | The Cloudflare Turnstile secret key. |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | The PostHog project key for analytics. The project must have cookieless mode turned on. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | The PostHog host that `/relay` forwards to. The default is `https://us.i.posthog.com`. For the EU, use `https://eu.i.posthog.com`. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | The Sentry project DSN. Production builds then report errors from the browser and the server. Browser events go through the `/monitoring` route. |
| `SENTRY_AUTH_TOKEN` | No | A Sentry organization auth token. With `SENTRY_ORG` and `SENTRY_PROJECT`, production builds upload source maps. Keep it on the server. |
| `SENTRY_ORG` | No | The Sentry organization slug. |
| `SENTRY_PROJECT` | No | The Sentry project slug. |

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Starts the development server at <http://localhost:3000>. |
| `pnpm build` | Makes a production build. The build reads the database, so it must have the environment variables. |
| `pnpm start` | Starts the production server after a build. |
| `pnpm test` | Runs the unit tests with Vitest. |
| `pnpm lint` | Runs ESLint. |
| `pnpm typecheck` | Makes the route types and runs the TypeScript compiler. |
| `pnpm db:test` | Runs the SQL smoke test on a scratch database. |

### Database tests

The SQL smoke test examines state transitions, counters, rate limits and privileges. It runs in a transaction and then rolls it back. Thus, it does not change the data.

1. Make a scratch Postgres database that has `pgvector`.
2. Apply the migrations to that database.
3. Run the test:

   ```bash
   SCRATCH_DB_URL=postgres://… pnpm db:test
   ```

## Deployment

Wishcode is made for [Vercel](https://vercel.com).

1. Import the repository into Vercel.
2. Add the same environment variables that you use in `.env.local`.
3. Mark all variables as **Sensitive**, but not the `NEXT_PUBLIC_` variables. The `NEXT_PUBLIC_` variables are public.
4. Make the variables available at build time. The build reads the database for the sitemap and for the static shell of the list.
5. Deploy.

You do not have to set `SITE_URL` on Vercel. The default is the production domain. Set it only for a custom domain.

## Architecture

```
Browser ──(Server Actions / GET)──▶ Next.js on Vercel ──(service role, RPC only)──▶ Supabase Postgres
   │                                     │                                          (RLS on, no policies,
   └── Supabase Auth (GitHub OAuth) ◀────┘ session cookie verified with getClaims()    anon has no grants)
```

### Data access

- **The browser has no database access.** All tables have row-level security (RLS) on, with no policies. The `anon` and `authenticated` roles have no privileges.
- **All reads and writes go through SQL functions.** Only `service_role` can run them. The Next.js server calls them after it verifies the device cookie or the GitHub session.
- **The publishable key is only for Supabase Auth.**

### Anonymous identity

Each device receives a random 256-bit token in an httpOnly `wc_device` cookie. The server makes the token at the first write. Thus, visits that only read stay in the cache. The database keeps only the SHA-256 hash of the token.

### Data integrity

- **Triggers keep the counters and the status correct.** They use row locks. Thus, the values stay correct during concurrent writes and for all write paths. The triggers control `status`, `verified`, `metoo_count`, `claim_count`, `link_count` and `live_link_count`.
- **Partial unique indexes** let each device add only one me-too to a wish. They also let each developer post only one live link to a wish.

### Verdicts

The wisher and the me-too visitors vote on each link. A trigger calculates the link's `verdict` after each vote:

1. If the wisher votes, the wisher's vote decides.
2. If the wisher does not vote, 3 votes verify or flag the link. A tie flags the link.

Only live links (links that are not flagged) count for the status. The `wishes.verified` column controls the badge: **Fulfilled ✓** or **Fulfilled · unverified**. If a visitor removes a me-too, the database deletes the votes from that device and stops its emails.

### Rate limits

Each limit is an atomic fixed-window counter. It is in the same transaction as the write. If a write goes over a limit, the full transaction rolls back. Daily windows start again at midnight UTC.

| Action | Device | Network | Developer |
| --- | ---: | ---: | ---: |
| Wishes each day | 2 | 20 | — |
| Me-toos each day | 100 | 1,000 | — |
| Claims each day | — | — | 5 |
| Links each day | — | — | 20 |
| Email subscriptions each day | 20 | 100 | — |
| Reports each day | 20 | 200 | — |
| Duplicate checks each hour (each IP) | — | 60 | — |

A network is a salted hash of the IP address. Offices, schools and mobile networks put many people on one IP address. Thus, the network limits are higher. All values are in `LIMITS` in [`src/lib/config.ts`](src/lib/config.ts).

> [!CAUTION]
> The network key comes from the `X-Forwarded-For` header. Vercel writes the real client IP into this header. If you use a different host, make sure that your proxy also replaces this header. If it does not, clients can select their own rate-limit key.

### Duplicate suggestions

- The `embed` Edge Function returns a 384-dimension `gte-small` embedding. The timeout is 4 seconds.
- An HNSW index finds wishes with a cosine similarity of 0.89 or more.
- Wishes without an embedding use `pg_trgm` matching.
- If the function is not configured or fails, all matching uses `pg_trgm`. Duplicate suggestions never stop a post.

### Moderation

- Each device can report a wish or a live link one time.
- Reports do not hide content automatically. They go into a queue at `/admin`. The most reported items are at the top.
- An admin removes the wish or the link, or dismisses its reports. Admins also see a remove control on each wish and each link.
- Admin rights come from `ADMIN_GITHUB_IDS` at sign-in. The list uses GitHub IDs, not handles, because another person can register a handle after a rename. Each admin function examines `developers.is_admin` again. For all other users, `/admin` returns 404.

### Email delivery

`postLink` schedules `notifyLinkPosted` with `after()`. The function runs after the server sends the response. It reads the recipients from `link_notification`. This is the only database function that returns email addresses. Then it makes each email with `buildLinkEmail` and sends the emails one at a time through [`src/lib/mailer.ts`](src/lib/mailer.ts). Each email link contains `<subscriptionId>.<HMAC>`. The database keeps no data for these links.

### Caching

- Public reads (list pages, wish pages, statistics and profiles) use `"use cache"` with tags.
- Writes call `updateTag`. Thus, new wishes, claims, links and statistics show immediately.
- Me-toos do not clear the cache. Each page reads the current counts and the viewer's me-toos in one primary-key lookup (`live_metoos`), out of the cache. Then the page puts these values on the cached data. Thus, the counts are live and the cache stays warm.
- Pages use partial prerendering. The server sends the static shell immediately. Then the data comes in a stream.

### Correct 404 responses

A page that streams sends its status code before it can call `notFound()`. Thus, [`src/proxy.ts`](src/proxy.ts) examines each request for `/w/:id` and `/d/:handle` against `page_exists`. It also examines the share URLs against the wish's links. If the page does not exist, the proxy sends the request to a path that has no route. Thus, the response is a real 404 with the correct text.

### Share cards

[`src/lib/og-card.tsx`](src/lib/og-card.tsx) draws three 1200×630 PNG images with bundled fonts:

| Card | Route | Page |
| --- | --- | --- |
| The wish | `/api/og/wish/:id` | `/w/:id` |
| "I built what 214 people wished for." (developer) | `/api/og/link/:linkId` | `/w/:id/by/:handle` |
| "My wish came true." (wisher) | `/api/og/wish/:id/came-true` | `/w/:id/came-true` |

- Each image URL has a `?v=` value. This value changes when the content of the card changes. Thus, the CDN keeps each card for one day.
- Link previews use page metadata. Thus, each card has its own page. Each page shows the wish (the canonical URL is `/w/:id`) with its card as `og:image`.
- A card page returns 404 when its card is not available. For example, a developer removes the link, the votes flag it, or the wisher does not confirm a link.
- The text and the URLs for sharing are in [`src/lib/share-copy.ts`](src/lib/share-copy.ts).

After a developer posts a link, the modal shows "You built it". After the wisher votes Yes, the page shows "Your wish came true". Each moment shows the card and buttons for X, LinkedIn, WhatsApp, Copy link and Download image. PostHog receives `share_moment_shown` and `share` events, with `card` set to `wish`, `developer` or `wisher`.

### Security

- The response headers include `frame-ancestors 'none'`, `nosniff`, HSTS, a strict referrer policy and a permissions policy.
- External links use `target="_blank" rel="noopener noreferrer nofollow ugc"`. Wishcode never shows them in an iframe.
- After sign-in, redirects go only to paths on the same site.

## API

### Server Actions

All changes to data use Server Actions in [`src/app/actions.ts`](src/app/actions.ts). Next.js accepts them only from the same origin.

| Action | Description |
| --- | --- |
| `postWish` | Posts a new wish. |
| `setMetoo` | Adds or removes a me-too. |
| `setClaim` | Adds or removes a developer claim. |
| `postLink` | Posts a live link. |
| `removeLink` | Removes a live link. |
| `setVerdict` | Records a Yes or No vote on a link. |
| `subscribe` | Adds an email subscription to a wish. |
| `report` | Reports a wish or a link. |
| `moderate` | Removes content or dismisses reports (admins only). |
| `emailVerdict` | Records a vote from an email link. |
| `unsubscribe` | Stops emails from an email link. |

### Public endpoints

| Route | Description |
| --- | --- |
| `GET /api/wishes?status=&sort=&cursor=` | The list of wishes, with cursor pagination. It includes live me-too counts and the viewer's me-toos. |
| `GET /api/wishes/:id` | One wish with its claims and links. |
| `GET /api/developers/:handle` | One developer profile. |
| `GET /api/og/wish/:id` | The wish share card (PNG). |
| `GET /api/og/link/:linkId` | The developer share card (PNG). It returns 404 for removed or flagged links. |
| `GET /api/og/wish/:id/came-true` | The wisher share card (PNG). It returns 404 until the wisher confirms a link. |
| `POST /e/unsubscribe?t=` | One-click unsubscribe (RFC 8058). `/api/unsubscribe` processes it. |

## Project structure

```
wishcode/
├── src/
│   ├── app/            # Routes, pages, API routes and Server Actions
│   ├── components/     # React components
│   ├── lib/            # Data access, email, share cards, configuration and tests
│   └── proxy.ts        # Request proxy (404 checks and unsubscribe routing)
├── supabase/
│   ├── migrations/     # Database schema, triggers and functions
│   ├── functions/embed # Embeddings Edge Function (gte-small)
│   └── tests/smoke.sql # SQL smoke test
└── assets/fonts/       # Fonts for the share cards
```
