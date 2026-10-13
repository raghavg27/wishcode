---
name: Public Ledger of Wishes
colors:
  surface: '#fff8f5'
  surface-dim: '#e0d8d5'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ee'
  surface-container: '#f5ece8'
  surface-container-high: '#efe6e3'
  surface-container-highest: '#e9e1dd'
  on-surface: '#1e1b19'
  on-surface-variant: '#524434'
  inverse-surface: '#34302d'
  inverse-on-surface: '#f7efeb'
  outline: '#857462'
  outline-variant: '#d7c3ae'
  surface-tint: '#835400'
  primary: '#835400'
  on-primary: '#ffffff'
  primary-container: '#f5a524'
  on-primary-container: '#643f00'
  inverse-primary: '#ffb957'
  secondary: '#006d37'
  on-secondary: '#ffffff'
  secondary-container: '#86faa7'
  on-secondary-container: '#00743a'
  tertiary: '#904d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff9f49'
  on-tertiary-container: '#6e3900'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb5'
  primary-fixed-dim: '#ffb957'
  on-primary-fixed: '#2a1800'
  on-primary-fixed-variant: '#643f00'
  secondary-fixed: '#86faa7'
  secondary-fixed-dim: '#6add8d'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#fff8f5'
  on-background: '#1e1b19'
  surface-variant: '#e9e1dd'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '500'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-wish:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-wish-mobile:
    fontFamily: Newsreader
    fontSize: 21px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-counter:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system embraces an honest, warm, and communal sensibility reminiscent of a physical community corkboard or an artisan ledger maintained by craftsmen. It steers decisively away from polished venture-backed SaaS dashboards, sterile analytics consoles, and cold corporate utilities. 

### Visual Ethos
- **Honest Physicality:** The canvas behaves like textured, tactile paper stock, anchored by crisp structural ink lines, subtle parchment borders, and understated warm elevations.
- **Playful Optimism:** The tone remains hopeful, inviting, and human. Wishes read like personal aspirations rather than technical bug tickets or sterile feature requests.
- **Craft & Utility:** Built with high legibility, unpretentious component outlines, tabular metrics, and evident tactile states (e.g., pressed endorsements, physical badge stamps).

## Colors

The palette is rooted in an organic, parchment-and-ink foundation with rich sunlit ambers and earthy accents.

### Core Roles
- **Canvas / Background (`#FAF7F2`):** Warm unbleached paper tone, providing organic comfort without high-glare eye strain.
- **Card Surface (`#FFFFFF`):** Clean white cards with tactile border framing.
- **Border / Divider (`#EAE4DA`):** Muted stone edge defining physical partitions and cards without harsh drop shadows.
- **Primary Ink (`#14110F`):** Deep, organic carbon-ink for primary copy and headings.
- **Muted Slate/Brown (`#6B6259`):** Secondary metadata, timestamps, counters, and supporting descriptions.
- **Wish Amber (`#F5A524`):** Focal action color for endorsements and key interactions. Hover transitions to `#E0941C`. Text on amber retains the high-contrast `#14110F` ink.

### Lifecycle Status Tokens
- **Fulfilled:** Leaf Green (`#1F9D55`), paired with tinted surface `#F0FDF4` and border `#BBF7D0`.
- **Being Built:** Craft Amber/Gold (`#D97706`), paired with tinted surface `#FFFBEB` and border `#FDE68A`.
- **Open:** Ink neutral (`#14110F`), paired with natural card background `#FAF7F2` and border `#EAE4DA`.
- **Removed / Archived:** Neutral stone grey (`#9CA3AF`), paired with surface `#F3F4F6` and border `#E5E7EB`.

## Typography

Typography establishes an editorial atmosphere: literary and expressive for wish statements, balanced by clear utilitarian mechanics for functional metadata.

- **Newsreader** serves as the primary editorial voice for all wish statements, hero declarations, and major headings. Its italic variant is reserved for user quotes, personal anecdotes, and reflective prompts.
- **Inter** provides neutral structure for all user interface controls, author attribution, status tags, and tabular data counters.
- **Tabular Figures:** Always apply `font-variant-numeric: tabular-nums` to numerical counters, votes, dates, and developer metrics to prevent structural jitter during active increments.

## Elevation & Depth

This system avoids synthetic floating elevations, intense multi-layer blurs, and neon drop shadows. Depth is achieved via paper layering, tonal contrasts, and warm ambient light.

- **Flat Paper Plane (Base):** Canvas is `#FAF7F2`.
- **Card Surface (Resting):** Pure `#FFFFFF` resting against the paper canvas, bounded by a crisp 1px solid border `#EAE4DA`. A gentle ambient contact shadow anchors the card: `0 1px 3px rgba(20, 17, 15, 0.04), 0 1px 2px rgba(20, 17, 15, 0.02)`.
- **Hover & Active Elevation:** Cards elevate gently on hover with `0 4px 12px rgba(20, 17, 15, 0.06)` and a border shift to `#DFD7CB`.
- **Modals & Drawers:** Grounded by a warm translucent veil (`rgba(20, 17, 15, 0.4)`), with surfaces framed by an explicit 1px `#EAE4DA` perimeter border.

## Shapes

The geometry balances structured architectural framing with friendly pill tags:
- **Cards & Sheets:** Explicitly styled with `12px` (`0.75rem`) corner radiuses, yielding soft, notebook-like corners without feeling toy-like.
- **Pills & Interactive Badges:** Fully circularized pill radius (`9999px`) for badges, actions, author cards, and the signature "Me too" vote trigger.
- **Form Controls:** Set to `8px` (`0.5rem`) for text boxes and inputs to differentiate functional entry fields from interactive pill chips.

## Components

### 1. Wish Cards
- **Container:** Pure `#FFFFFF` surface, 1px solid `#EAE4DA`, border radius `12px`, padding `1.25rem` (20px).
- **Header Section:** Status chip docked top-left; relative timestamp and menu docked top-right.
- **Body Section:** Wish headline set in Newsreader (`headline-wish-mobile` or `headline-wish`), followed by optional markdown elaboration in Inter (`body-md`, `#6B6259`).
- **Footer Section:** Horizontal flex bar holding the "Me too" pill, developer presence chips, and external application links.

### 2. "Me Too" Endorsement Pill
- **Resting (Unpressed):** Background transparent; border 1.5px solid `#F5A524`; text `#14110F`; icon of a raised hand with amber stroke. Minimum height 40px, horizontal padding `1rem`.
- **Active (Pressed):** Background `#F5A524`; border 1.5px solid `#F5A524`; text `#14110F` (semi-bold). Micro-bounce scale transition upon state change (`scale(0.97)` to `scale(1.0)`).
- **Counter:** Formatted with tabular numbers, separated by a thin warm border or light dot separator.

### 3. Status Chips
- **Geometry:** Height 24px, pill radius (`9999px`), horizontal padding `0.5rem`, text size `12px`, semi-bold.
- **Open:** Outline 1px `#14110F` at 20% opacity, background `#FAF7F2`, text `#14110F`.
- **Being Built:** 1px border `#FDE68A`, background `#FFFBEB`, text `#D97706`. Includes a gentle pulsing indicator dot.
- **Fulfilled:** 1px border `#BBF7D0`, background `#F0FDF4`, text `#1F9D55`. Preceded by a checkmark glyph.
- **Removed:** 1px border `#E5E7EB`, background `#F3F4F6`, text `#9CA3AF`.

### 4. Developer Chip
- **Layout:** Inline flex badge, height 28px, pill radius, padding `2px 8px 2px 2px`, background `#FAF7F2`, border 1px solid `#EAE4DA`.
- **Content:** 20px circular avatar on the left, followed by `@handle` in Inter `12px` font weight 500, color `#14110F`.

### 5. External Link Pill ("Open App")
- **Layout:** Compact button with border 1px solid `#EAE4DA`, background `#FFFFFF`, text `#14110F`, hover background `#FAF7F2`.
- **Labels:** Reads `Open app ↗` accompanied by a secondary muted domain badge (e.g., `loom.com`) in `11px` `#6B6259`.

### 6. Disclaimer Callout
- **Style:** Subtle informational box or inline note. Background `#FAF7F2`, border-left 2px solid `#EAE4DA`, padding `0.5rem 0.75rem`.
- **Copy:** Fixed microcopy: *"Wishcode doesn't check or vouch for linked apps."* Color `#6B6259`, size `12px`.

### 7. Form Inputs & Submission Bar
- **Input Fields:** Background `#FFFFFF`, border 1px solid `#EAE4DA`, focus ring 2px solid `#F5A524`, placeholder color `#9CA3AF`.
- **Mobile Sticky Navigation:** Compact sticky bottom/top utility bar with backdrop-blur (`12px`), paper tint (`rgba(250, 247, 242, 0.9)`), and high-contrast "Make a wish" primary amber button.