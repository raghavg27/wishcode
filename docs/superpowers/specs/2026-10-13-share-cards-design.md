# Share cards as the growth engine

Oct 13, 2026 · Sub-project B of the launch-feedback work · Depends on A (`2026-10-13-trust-and-loop-design.md`)

## Why

Launch feedback: *"Make share cards the main growth tool. Every fulfilled wish should produce a card a developer is proud to post, like 'I built what 214 people wished for.' That's your distribution."*

Today there is one card per wish (`/api/og/wish/:id`). It is wish-centric, labelled "WISHCODE PUBLIC LEDGER", and only offered through generic share buttons on the wish page. Nothing prompts a developer to share at the moment they ship.

## Decisions (agreed in brainstorming)

| Question | Decision |
| --- | --- |
| Who gets a card | The developer (per live link) and the wisher. The wish card stays for everyone else |
| Verification | The developer card is offered immediately and gains a "✓ Confirmed" stamp once verified. Flagged links get no card. The wisher card appears after the wisher taps "Yes, it works" |
| Formats | The 1200×630 link preview, plus a "Download image" of the same PNG |
| Developer layout | Headline-led: "I built what 214 people wished for." with the wish quoted underneath |

## 1. Cards

All cards are 1200×630 PNGs drawn by `next/og` (Satori) with the bundled fonts in `assets/fonts/`. They are served with `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800`, and pages link them with a `?v=` cache-buster that changes with anything shown on the card. Colours stay the current palette (the brand redesign is parked).

### 1.1 Shared pieces

- **People count** = `metoo_count + 1` (the wisher; wishers cannot me-too their own wish).
- **Developer headline:** `"I built what {n} people wished for."` when n ≥ 5. Otherwise `"I made someone's wish come true."`
- **Confirmed stamp** (developer and wisher cards), from A's link state:
  - `verified` + `wisher_verdict = true` → **✓ Confirmed by the wisher**
  - `verified` (crowd) → **✓ Confirmed by {works_count} people**
  - `unverified` → no stamp (nothing negative is ever printed on a card)
- **Footer:** the app's domain (`domainOf(link.url)`) on the left, `{host}/w/{id}` on the right
- The wordmark reads **Wishcode**. "PUBLIC LEDGER" is removed everywhere.
- Long wish text steps down in size, like today's card (64 → 56 → 48 px at 90/140 chars). On the developer and wisher cards the quote is secondary: 40 → 34 → 30 px.

These helpers live in `src/lib/share-copy.ts` (pure, unit-tested): `peopleCount`, `developerHeadline`, `confirmedStamp`, `shareText`, `cardFilename`.

### 1.2 Wish card (existing, refreshed): `/api/og/wish/:id`

- Wordmark "Wishcode". The status chip uses A's labels: **Open**, **Being built**, **Fulfilled · unverified**, **Fulfilled ✓**.
- An open or being-built wish's footer reads **"{n} people want this"**. A fulfilled wish keeps today's "Fulfilled by @handle · domain" line, using the first **live** link (not flagged).
- Removed wish → 404 (unchanged).

### 1.3 Developer card (new): `/api/og/link/:linkId`

```
+------------------------------------------------+
| (avatar) @handle                  ✓ Confirmed  |
|                                     by wisher  |
|   I built what                                 |
|   214 people wished for.                       |
|                                                |
|   "I wish there was an app that mutes my mic   |
|    when my dog barks"                          |
| ---------------------------------------------- |
| barkmute.app                  wishcode.app/w/42|
+------------------------------------------------+
```

404 when the link is deleted or flagged, or its wish is removed. `?v=` = `{verdict}-{works_count}-{metoo_count}`.

### 1.4 Wisher card (new): `/api/og/wish/:id/came-true`

Same frame as the developer card. The headline is **"My wish came true."**, then the quoted wish, then a row: *Built by (avatar) @handle · domain*, with the confirmed stamp top-right. It uses the **earliest non-deleted link where `wisher_verdict = true`**. 404 when there is no such link or the wish is removed.

## 2. Shared URLs

Social platforms read the preview from the page's metadata, so each card needs its own page URL:

| URL | Renders | `og:image` |
| --- | --- | --- |
| `/w/:id` | Wish page (unchanged) | Wish card |
| `/w/:id/by/:handle` | The same wish page, scrolled to and highlighting `@handle`'s link | Developer card for that handle's live link on that wish |
| `/w/:id/came-true` | The same wish page | Wisher card |

Implementation: both sub-routes reuse the wish page's content component and differ only in `generateMetadata` and a `highlightHandle` prop. The canonical URL stays `/w/:id` for all three, so search engines see one page. `proxy.ts`'s 404 check extends to these paths. `/by/:handle` returns 404 when that handle has no live link on the wish, and `/came-true` returns 404 when the wisher has confirmed no link.

Metadata title and description:

- `/by/:handle`: title `"@handle built “{wish}”"`, description `"{n} people wished for this on Wishcode."`
- `/came-true`: title `"A wish came true: “{wish}”"`, description `"Built by @handle on Wishcode."`

## 3. Share moments

One client component, `ShareMoment`, with `variant: "developer" | "wisher"`, shows:

- a card preview (`<img>` of the actual OG route, with an aspect-ratio box and skeleton while loading)
- buttons: **Post on X**, **LinkedIn**, **WhatsApp**, **Copy link**, **Download image**
- a **Done** button

C adds the confetti burst when it opens.

### 3.1 Developer: "You built it"

- After `postLink` succeeds, the post-link modal switches its content to `ShareMoment variant="developer"` instead of closing. `postLink` already returns `linkId`. The action additionally returns `handle` so the client can build `/w/:id/by/:handle`.
- Afterwards, the developer's own link card on the wish page and each of their live links on their profile (`/d/:handle`, own profile only) show a small **Share** button that opens the same moment in a modal.
- Share text: `I built what {n} people wished for: “{wish}”`, or under 5 people `I made someone's wish come true: “{wish}”`, followed by the URL.

### 3.2 Wisher: "Your wish came true"

- When the wisher's `setVerdict(linkId, true)` succeeds on the wish page, a panel with `ShareMoment variant="wisher"` opens. On A's email verdict page, after a successful "Yes" from a wisher subscription, the thank-you state includes the same panel.
- On later visits, viewers for whom `viewer_wish_state.is_wisher` is true and who have a wisher-verified link see a compact **"Share that your wish came true"** button in the share section, which opens the panel.
- Share text: `My wish came true: “{wish}”, built by @handle`, followed by the URL.

### 3.3 Download image

`DownloadImageButton({ src, filename })` fetches the PNG as a blob.

- On touch devices where `navigator.canShare({ files })` is true, it opens the native share sheet with the file.
- Otherwise it triggers an `<a download>` with an object URL, then revokes it.
- If the fetch fails, a toast says "Couldn't download the image. Try again."
- Filename: `wishcode-{wishId}-{handle}.png` (developer and wisher cards) or `wishcode-{wishId}.png` (wish card).

### 3.4 Reuse

`src/components/share.tsx` gains `DownloadImageButton`. `ShareTargets` gains an optional `card` prop for analytics. The existing wish-page share section keeps working unchanged apart from the card refresh.

## 4. Analytics

`track("share", { path, method, card })`, where `card ∈ "wish" | "developer" | "wisher"`. The developer and wisher moments also fire `track("share_moment_shown", { card })` when they open, so PostHog can show the shown → shared → clicked-through funnel (the PRD's 15% share-click-through metric).

## 5. Testing

**Vitest** (`share-copy.ts`):

- `peopleCount` adds the wisher
- `developerHeadline` at n = 4, 5 and 214
- `confirmedStamp` for wisher-verified, crowd-verified (including the count) and unverified
- `shareText` for both variants, including the fallback and quote marks
- `cardFilename` for each card

**Route checks** (manual, or a small script against `pnpm dev`):

- Each OG route returns a 200 `image/png` for valid input
- 404 for a removed wish, a deleted link, a flagged link, a handle with no link on the wish, and `/came-true` with no wisher-verified link

**Manual:** post a link → "You built it" shows the card → download works on desktop Chrome and iOS Safari → paste `/w/:id/by/:handle` into the X composer and Slack and check the preview → vote Yes as the wisher → the "Your wish came true" panel shows the wisher card.

## 6. Out of scope

Square or portrait formats, an Instagram-specific flow, auto-posting to social accounts, per-platform card variants, a me-too-er card, and redesigning card colours (that waits for the brand work).
