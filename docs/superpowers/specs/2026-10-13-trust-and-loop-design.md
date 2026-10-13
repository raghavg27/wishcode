# Trust and the loop: verified fulfilment and wish notifications

Oct 13, 2026 · Sub-project A of the launch-feedback work

## Why

Feedback from a launch reviewer named two holes in the core loop:

1. **Wishers never learn their wish came true.** The v1 PRD accepted this; it breaks the loop.
2. **"Fulfilled" means nothing.** Any https link turns a wish green. A scam link gets the same badge as a real app.

This sub-project fixes both. Share cards (B) and the copy/delight pass (C) follow and build on the states defined here. Cold-start seeding, the founder note and the brand redesign are out of scope for now.

## Decisions (agreed in brainstorming)

| Question | Decision |
| --- | --- |
| Notification channel | Email only |
| Provider | Gmail SMTP (nodemailer + Google App Password) |
| Who can verify a link | The wisher alone, or 3 me-too-ers |
| Negative signal | "Doesn't work" votes; enough of them flag and collapse the link |
| Who can subscribe | The wisher and anyone who me-too'd |
| What sends an email | Every new live link on a subscribed wish (claims never email) |
| Email confirmation | None. Subscriptions are live immediately; every email has unsubscribe |
| Delivery | Sent directly after the response with `after()`; no outbox, no retries |

## 1. Verdicts and what "Fulfilled" means

### 1.1 Eligibility

A device may vote on a link if, at the time of the vote:

- it is the wisher (`wishes.device_id`), or
- it has an active me-too on the link's wish.

The link and the wish must not be deleted. Each eligible device has at most one verdict per link: **works** (`true`) or **doesn't work** (`false`). It can change or clear it at any time.

When a me-too is removed, that device's verdicts on all links of that wish are deleted (trigger on `metoos` delete).

### 1.2 Link state

Every link has `verdict ∈ {unverified, verified, flagged}`. A trigger recomputes it whenever a verdict on that link changes:

1. **Wisher overrides.** If the wisher has a verdict: works → `verified`, doesn't work → `flagged`.
2. **Otherwise the crowd decides**, counting me-too-er verdicts only (`works_count`, `broken_count`):
   - `verified` if `works_count >= 3` and `works_count > broken_count`
   - `flagged` if `broken_count >= 3` and `broken_count >= works_count` (a tie leans toward safety)
   - `unverified` otherwise

`links` gains `verdict`, `works_count`, `broken_count` and `wisher_verdict` (nullable boolean, so the UI can say "confirmed by the wisher"). All are maintained by the trigger and never written directly.

### 1.3 Wish status

The three statuses (`open`, `being_built`, `fulfilled`) stay. Status is now derived from **live links**, meaning non-deleted links that are not flagged:

- `fulfilled` if there is at least one live link
- else `being_built` if there is at least one claim
- else `open`

`wishes` gains:

- `live_link_count`: non-deleted, non-flagged links. This drives status.
- `verified`: boolean, true when at least one non-deleted link is `verified`

`link_count` keeps its current meaning (all non-deleted links) for display. `fulfilled_at` is set when `live_link_count` goes from 0 to ≥1 and cleared when it returns to 0.

Implementation: replace the link branch of `private.bump_wish` with `private.refresh_wish_links(wish_id)`. It locks the wish row and recomputes `link_count`, `live_link_count`, `verified`, `status` and `fulfilled_at` from `links`. The link trigger (insert, delete, `deleted_at` change) and the verdict trigger (when a link's `verdict` changes) both call it. Me-too and claim counters keep their increment logic.

So: a wish whose only link is flagged drops back to Being built or Open. A flagged link that later becomes verified (for example the wisher changes their mind) restores Fulfilled.

### 1.4 Display

| State | Badge |
| --- | --- |
| Fulfilled, `verified = false` | **Fulfilled · unverified**, amber |
| Fulfilled, `verified = true` | **Fulfilled ✓**, green |

The ledger's Fulfilled filter includes both. Feed cards, the wish header, developer profiles and the OG card all use the same badge component. (B redesigns the OG card; A only fixes its status text.)

### 1.5 Known limits (accepted)

- Me-too is free, so one person with 3 browsers could fake a verification or a flag. Existing per-network me-too limits raise the cost, and admin delete is the backstop.
- The developer who posted a link can vote on it from a device that me-too'd the wish. Devices and GitHub identities are never linked.

## 2. Email opt-in

### 2.1 Where people opt in

- **Wisher:** `/w/:id?posted=1` (where posting already redirects) shows a card: *"Want to know when someone builds this?"* with an email field and **Notify me**. It is dismissible and never required.
- **Me-too-ers:** after a successful me-too, the me-too control shows a small *"Email me when it's built"* link that expands the same field inline.
- After subscribing, the control reads *"We'll email you when someone builds this."* The server returns only `subscribed: true/false` for the current device and never returns the address.
- The last email used is kept in the browser's `localStorage` (wrapped in try/catch) to pre-fill the field. It is never sent anywhere except the subscribe action.

### 2.2 Storage

```
subscriptions
  id               bigint identity pk
  wish_id          bigint not null → wishes
  device_id        bigint not null → devices    -- whose verdict an email vote counts as
  email            text not null                -- lower-cased, trimmed, ≤ 254 chars
  created_at       timestamptz not null default now()
  unsubscribed_at  timestamptz
  unique (wish_id, email)

email_suppressions
  email       text primary key
  created_at  timestamptz not null default now()
```

Both tables have RLS on with no policies, like every other table. No read RPC, API route or page ever returns `email`.

Subscribing again with an address that unsubscribed from that wish clears `unsubscribed_at` and moves the subscription to the current device. Subscribing does **not** clear a global suppression. The UI then says the address has turned off all Wishcode emails.

### 2.3 Limits

New entries in `LIMITS`: `subscriptionsPerDevicePerDay: 20`, `subscriptionsPerNetworkPerDay: 100`. They are enforced in the same transaction as the insert, like the existing limits. An idempotent re-subscribe (same wish, same email, already active) does not consume the limit.

Only devices that are the wisher or have an active me-too on the wish may subscribe to it.

### 2.4 Tokens in emails

Email links carry `t = <subscriptionId>.<sig>`, where `sig = base64url(HMAC-SHA256(EMAIL_TOKEN_SECRET, "sub:" + subscriptionId))`. The server checks the signature in constant time before calling any RPC. Nothing is stored for tokens. `EMAIL_TOKEN_SECRET` falls back to `SUPABASE_SECRET_KEY`, the same pattern as `RATE_LIMIT_SALT`.

(This refines the brainstormed "stored token hash". Wishcode has to rebuild the token each time it sends an email, and a stored hash can't be turned back into the token.)

## 3. Sending

### 3.1 Flow

1. `postLink` succeeds (the `create_link` RPC committed).
2. `after(() => notifyLinkPosted(linkId))` runs after the response is sent.
3. `notifyLinkPosted` calls `link_notification(p_link_id)`. That returns the wish text, link URL and description, the developer handle, and the recipients: active subscriptions whose email is not suppressed, each with `subscription_id`, `email` and `is_wisher` (`subscriptions.device_id = wishes.device_id`).
4. Each recipient gets one email, sent one after another. A failure is logged as `console.error("[notify] …")` with the subscription id (never the address) and skipped. No retries.

If the wish or link was deleted in the meantime, `link_notification` returns no recipients.

### 3.2 Mailer

`src/lib/mailer.ts` is the only module that knows about SMTP. It exports `sendMail({ to, subject, text, html, headers })`, backed by nodemailer using the `gmail` service.

- Env: `GMAIL_USER`, `GMAIL_APP_PASSWORD`. If either is unset, `sendMail` logs once and returns without sending, so dev, preview and tests work without credentials.
- The From address is `"Wishcode" <GMAIL_USER>`.
- Gmail's cap is about 500 recipients a day (about 2,000 on Workspace). Past that, sends fail and are logged. Accepted for launch.

### 3.3 Email content

Built by a pure function, `buildLinkEmail({ wishText, wishUrl, linkUrl, description, handle, isWisher, token })` → `{ subject, text, html }`. It is unit-tested.

- Subject: *"Someone built your wish"* (wisher) or *"Someone built a wish you wanted"* (me-too-er)
- Body: the wish text quoted, then *"@handle built it:"* with the description and the app URL, then **Does it work? Yes / No** buttons, and a link to the wish page
- Footer: *"Stop emails for this wish"* · *"Stop all Wishcode emails"*
- Headers: `List-Unsubscribe: <https://…/e/unsubscribe?t=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- Plain HTML with inline styles and no images, plus a full plain-text part

### 3.4 Email landing pages (no change on GET)

Mail scanners open every link in an email, so a GET request never changes anything.

| Route | GET shows | POST does |
| --- | --- | --- |
| `/e/verdict?t=…&link=…&works=1\|0` | The wish, the link, and a single button: "Yes, it works" or "No, it doesn't work" | Server Action: `set_verdict_by_subscription`, then shows a thank-you with a link to the wish |
| `/e/unsubscribe?t=…[&all=1]` | "Stop emails for this wish?" or "Stop all Wishcode emails?" with one button | Server Action: `unsubscribe` |
| `POST /e/unsubscribe?t=…` (route handler) | — | RFC 8058 one-click: unsubscribes from that wish and returns 200 |

A bad or tampered token shows "This link has expired or is invalid." with a link home. A vote from an email counts as the subscription's device and follows §1.1. If that device has since removed its me-too, the page says the vote can't be counted and links to the wish.

## 4. Wish page UI

### 4.1 Per link

- **State chip:** *Unverified* (stone), *Works ✓* (green) with *"confirmed by the wisher"* or *"confirmed by N people"*
- **Flagged links** render collapsed: a muted row, *"People say this doesn't work"*, with a **Show anyway** toggle that reveals the normal card. Flagged links sort after the others.
- **Voting:** eligible viewers see *"Did it work for you?"* **Yes** / **No**, with their current vote pressed. Pressing it again clears the vote. Everyone else sees the counts: *"3 say it works · 1 says it doesn't"*. Nothing shows when both counts are 0.
- The disclaimer becomes: *"Wishcode doesn't check linked apps. People who wanted this wish vote on whether each link works."*

### 4.2 Viewer state

The wish page is cached, so viewer-specific state comes from one uncached RPC per page view, `viewer_wish_state(p_token_hash, p_wish_id)` → `{ is_wisher, has_metoo, subscribed, verdicts: { [link_id]: boolean } }`. This follows the existing `live_metoos` pattern. With no device cookie, it is skipped and everything is false.

### 4.3 Server Actions

| Action | RPC | Invalidates |
| --- | --- | --- |
| `setVerdict(linkId, works: boolean \| null)` | `set_verdict(p_token_hash, p_link_id, p_works)` | wish, ledger, developer, stats |
| `subscribe(wishId, email)` | `subscribe(p_token_hash, p_ip_key, p_wish_id, p_email, limits)` | nothing (viewer state is uncached) |
| `emailVerdict(token, linkId, works)` | `set_verdict_by_subscription(p_subscription_id, p_link_id, p_works)` | wish, ledger, developer, stats |
| `unsubscribe(token, all)` | `unsubscribe(p_subscription_id, p_all)` | nothing |

New error codes, using the existing P0001 + `toActionError` pattern: `not_eligible` ("Only people who wanted this can vote." / "Tap Me too first to get emails."), `invalid_email`, `suppressed`, plus the existing `rate_limited`.

## 5. Testing

**SQL** (`supabase/tests/smoke.sql`, rolled-back transaction):

- The wisher's works vote verifies a link with no crowd votes. The wisher's no vote flags it even with 5 works votes.
- 3 works votes → verified. 2 works → unverified. 3 broken vs 3 works → flagged. 4 works vs 3 broken → verified.
- A wish whose only link becomes flagged → `being_built` (with a claim) or `open`. Un-flagging restores `fulfilled` and `fulfilled_at`.
- `verified` follows verified links, including when a verified link is deleted.
- A non-eligible device's vote raises `not_eligible`. Removing a me-too deletes that device's verdicts and recomputes the link.
- Subscribe: eligibility, idempotent re-subscribe, rate limit, re-subscribe after unsubscribe, and suppression excludes the address from `link_notification`.
- `anon`/`authenticated` cannot read `subscriptions` or `email_suppressions` or execute the new functions. No read RPC output contains an `email` key.

**Vitest:**

- Email normalization and validation
- `buildLinkEmail`: subject for wisher vs me-too-er, URLs contain a valid token, HTML escapes the wish text and description
- Token sign and verify: round trip, tampered signature, wrong id, malformed input
- `sendMail` with no env vars resolves without throwing and without calling the transport

**Manual end-to-end:** post a wish, opt in with a real Gmail address, post a link from a second GitHub account, receive the email, vote "Yes" from the email page on another device, and see the badge change to Fulfilled ✓. Then unsubscribe from the email and post a second link to confirm no email arrives.

## 6. Docs and config

- **PRD:** remove "notifications of any kind" and "wisher confirmation or verdicts" from the non-goals. Add the verdict rules, the status change and the email features. Replace the "Wishers never learn" risk row. Update "Wishers are fully anonymous" to say an optional email is stored only to notify about that wish.
- **README:** Gmail setup (2-Step Verification → App Password), the new env vars, and the email routes.
- **`.env.example`:** `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_TOKEN_SECRET`.
- **Principles page:** one line on the email and voting.
- **New dependency:** `nodemailer` (+ `@types/nodemailer`).

## 7. Out of scope

Emailing developers when their link is verified, an outbox or retries, digests, emails on claims, email confirmation, web push, wishers editing or withdrawing wishes, and an admin UI.
