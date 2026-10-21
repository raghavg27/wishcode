# Wishing star: logo and palette

Oct 21, 2026 · The brand redesign parked in sub-projects A, B and C

## Why

Launch feedback asked for a logo and palette of our own. Four directions were mocked up (wishing star, dandelion, wish{code}, idea bubble) and the founder picked **A: Wishing star**.

A shooting star is the oldest way to make a wish. Its trail breaks into dashes, like a cursor that's still typing. The palette is night blue and gold, and share cards turn night blue so they stand out in a light feed.

## The mark

A gold four-point star in the top right of a night-blue rounded square (64×64, radius 15), with a trail toward the bottom left: one long dash, one short dash at 70% opacity, one dot at 45%. The 16 px favicon merges the trail into one stroke so it survives at that size. On a night background the square is dropped and only the star and trail show.

The logo is the mark plus "Wishcode" in Newsreader semibold. Lowercase or code-styled wordmarks are not part of this direction.

## Palette

| Name | Hex | Job |
| --- | --- | --- |
| Night | `#1D1B45` | Ink, the mark's square, share-card background |
| Gold | `#F4B740` | Buttons, the star, focus rings |
| Paper | `#FBF8F1` | Page |
| Haze | `#EEECF6` | Surfaces, secondary buttons |
| Dusk | `#57557A` | Muted text |
| Leaf | `#1F8A5B` | Fulfilled |
| Ember | `#C4561F` | Being built |
| Flag | `#C0362C` | Errors |

Text on gold is night. Every text and background pair keeps at least 4.5:1.

## How it lands in code

- **Tokens:** `globals.css` keeps every token *name* (`amber`, `leaf`, `craft`, `surface-*`, …) and only changes values, as with the code identifiers in C. `amber` becomes gold, `craft` becomes ember, `ink` becomes night, and the surface ladder runs from paper to haze. Shadows and the dialog backdrop are tinted night instead of warm brown.
- **Logo:** `LogoMark` in `icons.tsx` draws the new mark. `app/icon.svg` is the same mark. `themeColor`, the manifest colours and `global-error.tsx` use paper, night and gold.
- **Share cards:** `og-card.tsx` `Frame` turns night with paper text, and `Mark` becomes the star (no more "W" square). The card routes keep their layout. Their colour constants (`INK`, `MUTED`, `SUBTLE`, `CRAFT`, `DOT`) now hold the on-night values, and the domain is highlighted in gold. Status chips use the new palette.
- **Emails:** `link-email.ts` stays light (paper and white) with a gold button, night text and dusk for small text.
- **Confetti:** gold, leaf and night.

## Out of scope

Dark mode for the site, renaming tokens, new illustrations, and changing the doodles (they already use the ink token, so they turn night blue on their own).
