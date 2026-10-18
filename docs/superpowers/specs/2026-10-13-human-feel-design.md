# Human feel: copy pass and delight touches

Oct 13, 2026 · Sub-project C of the launch-feedback work · Builds on A and B

## Why

Launch feedback: *"Cut the jargon ('velocity', 'high intent', 'public domain ledger') and write the way you talk"* and *"Add small touches AI tends to skip, like a fun empty state, a micro-animation when you tap 'Me too', or a confetti moment when a wish is fulfilled."*

**Parked for now** (the founder needs to provide them): the founder note / "I built this because…" section with a photo, and the logo and palette redesign. Nothing here should make those harder later. Doodles use the current ink token, and no copy invents a personal story.

## Decisions (agreed in brainstorming)

| Question | Decision |
| --- | --- |
| "Ledger" | Dropped from every user-facing string |
| Voice | "I", a solo maker, where the site speaks. Errors and buttons stay neutral and short |
| Empty states | One witty line + a tiny line-drawn SVG doodle + one useful button |
| Me-too | CSS-only wave, squish, count roll and "+1" float |
| Confetti | `canvas-confetti`, loaded on demand, fired at three moments only |

## 1. Copy pass

### 1.1 Rules

1. No "ledger" in any user-facing string. Wishcode is *where people post apps they wish existed, and developers build them*.
2. The site speaks as **"I"** when it explains itself (principles, disclaimer, login, errors that are Wishcode's fault). Buttons, labels and validation messages have no pronoun.
3. Plain words over labels: no "velocity", "high intent", "charter", "auth step", "releases", "time to first ship".
4. Short sentences. If it sounds odd said out loud, rewrite it.
5. Code identifiers (`ledger_feed`, `tags.ledger`, `LedgerList`, `LedgerNote`, file names) are **not** renamed.

### 1.2 String changes

Strings added by A (email pages, opt-in, verdict UI) follow the same rules. Any "ledger" in them becomes "all wishes".

**Site-wide**

| File | Now | After |
| --- | --- | --- |
| `app/layout.tsx` title | Wishcode — a public ledger of software wishes | Wishcode — apps people wish existed |
| `app/layout.tsx` description | A public ledger of software wishes. Post a one-sentence wish without signing up; developers claim it or post a live link. | Post an app you wish existed. No signup. Developers build them and share the link. |
| `app/manifest.ts` | A public ledger of software wishes. | Post an app you wish existed. Developers build them. |
| `components/site-footer.tsx` | Wishcode is a public ledger of software wishes. | Post an app you wish existed. Someone might build it. |
| `components/nav-links.tsx` (×2) | Ledger | Wishes |
| `lib/config.ts` `DISCLAIMER` | Wishcode doesn't check or vouch for linked apps. | I don't check links before they go up. |

**Home and sidebar**

| File | Now | After |
| --- | --- | --- |
| `app/page.tsx` (sr-only h1) | Wishcode: the public ledger of software wishes | Wishcode: post an app you wish existed |
| `components/ui.tsx` `LedgerNote` | Wishcode is a crowd-sourced public wish ledger. Anyone can post ideas or link implementations. {DISCLAIMER} | Anyone can post a wish, and any developer can post what they built. I don't check links before they go up, so the people who wanted each wish vote on whether it works. |
| `components/sidebar.tsx` `WeekStats` footer | Weekly velocity · +12% vs last week | One line: "12% more wishes than last week" / "8% fewer wishes than last week" / "Same as last week" |
| `components/sidebar.tsx` `MostWanted` subtitle | Developer shortlist · High intent | Lots of people want these. Nobody's built them yet. |
| `components/sidebar.tsx` `BuildCta` | Connect GitHub to claim a wish or post a live link. No deadlines, no approval rituals. | Connect GitHub to claim a wish or share what you built. No deadlines, nobody to ask permission. |
| `components/sidebar.tsx` `SidebarFootnote` | Public ledger | Every wish is public |
| `components/duplicate-modal.tsx` heading | Similar wishes on the ledger | Someone may have wished this already |
| `components/duplicate-modal.tsx` subheading | Sorted by similarity | Closest match first |

**Wish page** (`app/w/[id]/page.tsx`, `components/developer-panel.tsx`)

| Now | After |
| --- | --- |
| Back to ledger | All wishes |
| Independent developer releases | What people built |
| Wishcode doesn't check, audit, or vouch for linked apps. Review code and install at your own discretion. | I don't check links before they go up. The people who wanted this wish vote on whether each one works. *(replaces A's wording)* |
| More me-toos help developers see the demand. | Every me-too tells developers this is worth building. |
| Wish record | About this wish |
| Time to first ship | Built in |
| This wish was removed by a moderator. / Its text is no longer shown and actions are disabled. | This wish was removed. / Its text is hidden and you can't me-too it anymore. |
| Actions unavailable on removed wishes | *(removed; the line above covers it)* |
| Wishcode public ledger *(share-card preview caption)* | Wishcode |
| No deadlines, no claim limits. Anyone can ship code. | No deadlines. Anyone can build it. |
| Requires GitHub. No deadlines, no claim limits. Anyone can ship code. | You'll need GitHub. No deadlines. Anyone can build it. |
| Built something for this, or planning to? This wish is fulfilled, but alternative builds, platforms and forks are always welcome. | Built your own version? Post it. Different takes, platforms and forks are all welcome. |
| Planning to build this? Claim it so others know, or post a live link when it works. | Building this? Claim it so others know, then post the link when it works. |

**Principles** (`app/principles/page.tsx`, rewritten in full)

- Metadata description: "How Wishcode works: anyone can wish, developers build, and the people who wanted it decide if it works."
- Kicker "Charter": removed. H1 "How the ledger works" → **"How it works"**.
- Intro: "Wishcode is where people post apps they wish existed, and developers build them. Here's how I run it."
- Items:
  1. **Anyone can wish.** Post one sentence ({WISH_MIN}–{WISH_MAX} characters). No account. Leave an email if you want, and I'll tell you when someone builds it. I only use it for that, and every email has an unsubscribe link. Wishes stay up unless they're spam.
  2. **Everyone can see the demand.** Every wish shows how many people want it, who's building it and what they've built. One me-too per device per wish, and you can take it back.
  3. **Claiming is a heads-up, not a lock.** Developers who connect GitHub can say "I'm building this." Claims never expire, lots of people can claim the same wish, and nobody has to claim before shipping.
  4. **The people who wanted it decide if it works.** When a developer posts a link, the wish shows *Fulfilled · unverified*. If the wisher says it works, or 3 people who me-too'd it do, it becomes *Fulfilled ✓*. If enough of them say it doesn't work, the link gets folded away with a warning.
  5. **Open links with care.** I don't check links before they go up. They open in a new tab, show who posted them, and the developer or I can take them down.
  6. **Fair use.** "To keep things fair: …" (same limits sentence, plus the email opt-in limits from A).

**Login** (`app/login/page.tsx`)

| Now | After |
| --- | --- |
| Back to ledger | All wishes |
| Auth · Step 1 of 1 | *(removed)* |
| We use your GitHub handle and avatar. Nothing else. | I only use your GitHub handle and avatar. Nothing else. |
| Community etiquette *(divider)* | Good to know |
| Return to the ledger → | Back to the wishes → |

**Developer profile and directory**

| File | Now | After |
| --- | --- | --- |
| `app/d/[handle]/page.tsx` | Public community ledger | Public profile |
| `app/d/[handle]/page.tsx` | No deadlines, no claim limits. Claims stay until unclaimed or shipped. | No deadlines. A claim stays until they ship it or drop it. |
| `app/developers/page.tsx` empty | No builders yet. Be the first to connect GitHub. | *(empty state, see §3)* |

**Errors and 404s**

| File | Now | After |
| --- | --- | --- |
| `app/error.tsx` | The ledger hiccupped / Something went wrong loading this page. It's usually temporary. / Go to the ledger | Something broke on my end / It's usually temporary. Try again in a moment. / Back to all wishes |
| `components/not-found-view.tsx` kicker | Not on the ledger | Nothing here |
| `components/not-found-view.tsx` generic | This page isn't here / The link may be mistyped, or the page never existed. Everything on Wishcode starts from the ledger. / Go to the ledger | I looked everywhere. Nothing here. / The link might have a typo, or the page never existed. / Back to all wishes |
| `components/not-found-view.tsx` wish | secondary "Browse the ledger" | Browse wishes |
| `components/not-found-view.tsx` developer | secondary "Back to the ledger" | Back to all wishes |

Strings not listed (toasts, validation, "Me too", "Load more wishes", etc.) already read fine and stay.

## 2. "Me too" micro-animation

`components/metoo.tsx`, CSS keyframes in `globals.css` next to the existing `--animate-pop`. No library.

| Part | On me-too (activate) | On undo |
| --- | --- | --- |
| Button | Squish: scale 0.94 → 1, 180 ms ease-out, then fills amber (existing active style) | Same squish, returns to the outline style |
| Hand icon | Wave: rotate 0 → −15° → 10° → 0, 420 ms, origin at the bottom centre | none |
| Count | Rolls up: the old number slides up and fades out, the new one slides in from below, 220 ms | Rolls down (reverse direction) |
| "+1" | A small `+1` in `text-primary` floats 16 px up and fades out over 600 ms, absolutely positioned so it never shifts layout | none |

- Animations are triggered by the user's tap (a `key` bump or class toggle), not by count changes from the server, so live-count refreshes never animate.
- They run on the optimistic update and don't wait for the server. If the action fails, the existing rollback restores the state without animating.
- The count roll uses `tabular-nums` and a fixed-height overflow-hidden box so digits don't jitter.

## 3. Empty states and doodles

`src/components/doodles.tsx` exports six components. Each is a 64×64-viewBox inline SVG, `stroke="currentColor"`, 1.5 px rounded strokes, no fill, and `aria-hidden`. They render in `text-outline`. All are original simple line drawings and stay under about 15 path commands each.

An `EmptyState({ doodle, title, body?, action? })` component in `ui.tsx` lays them out: doodle, then a serif title line, an optional muted body and an optional button.

| Where | Doodle | Title | Action |
| --- | --- | --- | --- |
| Ledger, filter All, no wishes | `Lamp` (unlit) | No wishes yet. Rub the lamp. | Post the first wish → `/#compose` |
| Filter Open, none | `Inbox` (empty tray) | Everything's being built or done. Wild. | See what's been built → `?status=fulfilled` |
| Filter Being built, none | `Laptop` (closed, idle) | Nobody's building yet. First one in gets bragging rights. | Browse open wishes → `?status=open` |
| Filter Fulfilled, none | `Tumbleweed` | Nothing fulfilled yet. This tumbleweed is waiting for a hero. | Browse open wishes → `?status=open` |
| Developer profile, no links | `StickyNote` (blank) | Nothing shipped yet. Give it time. | (own profile only) Find a wish to build → `/?status=open&sort=top` |
| `/developers`, none | `Laptop` | No builders yet. The first one gets to be first. | Connect GitHub → `/login` |
| 404 pages | `Magnifier` (over nothing) | Variant title from §1.2 | Variant buttons from §1.2 |

## 4. Confetti

`src/lib/celebrate.ts` exports `celebrate(): Promise<void>`:

- Returns immediately if `window.matchMedia("(prefers-reduced-motion: reduce)").matches`.
- Otherwise it calls `import("canvas-confetti")` (dynamic, so it isn't in any page's initial bundle) and fires two bursts from the bottom-left and bottom-right corners, angled inward. That's about 80 particles total, in colours `#f5a524` (amber), `#1f9d55` (leaf) and `#1e1b19` (ink), with `disableForReducedMotion: true` as a second guard.

It is called exactly once when each of these opens:

1. B's developer "You built it" moment (after `postLink`)
2. B's wisher "Your wish came true" panel (after the wisher's Yes vote on the wish page)
3. A's email verdict page thank-you state, when a wisher subscription confirmed "Yes, it works"

It never fires on page load, for crowd votes or for me-toos.

New dependency: `canvas-confetti` (+ `@types/canvas-confetti`).

## 5. Accessibility

- With `prefers-reduced-motion: reduce`, the me-too wave, squish, roll and +1 are disabled (via a `motion-safe:` variant or a media query) and only the colour change remains. Confetti doesn't fire.
- Doodles are `aria-hidden`. The title text carries the meaning.
- The count keeps its existing accessible label. The rolling digits are visual only, and the real number lives in a visually hidden span so screen readers announce it once.

## 6. Testing

**Vitest:**

- `celebrate()` resolves without importing `canvas-confetti` when reduced motion is set (mock `matchMedia` and the dynamic import)
- `WeekStats` delta copy for positive, negative and zero, plus null when there's no previous week (extract to a pure `weekDeltaText` helper)

**Grep check:** `grep -rni "ledger" src --include=*.tsx` returns only code identifiers (no string literals or JSX text). This runs as part of the final verification.

**Manual:**

- Tap and untap Me too on desktop and mobile
- Post a link → confetti → close
- Vote Yes as the wisher → confetti
- Turn on macOS "Reduce motion" and repeat (no motion, still works)
- View each empty filter on an empty DB, an empty profile, and each 404 variant
- Read every changed page once out loud for tone

## 7. Out of scope

Founder note and photo, logo and palette, illustration style beyond the six doodles, sound effects, haptics, animating cards in the feed, and renaming code identifiers.
