/**
 * The logo's star and dashed trail without the night square, for drawing on
 * night panels. data-core and data-dash let the landing animations find the
 * parts; the star's centre is (40, 24) in the 64-unit box.
 */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" overflow="visible" aria-hidden className={className}>
      <g data-trail>
        <path data-dash d="M30 34L24 40" stroke="#f4b740" strokeWidth="4" strokeLinecap="round" />
        <path data-dash d="M20 44L17 47" stroke="#f4b740" strokeWidth="4" strokeLinecap="round" opacity=".7" />
        <circle data-dash cx="13" cy="51" r="2" fill="#f4b740" opacity=".45" />
      </g>
      <path data-core d="M40 10C41 20 44 23 54 24C44 25 41 28 40 38C39 28 36 25 26 24C36 23 39 20 40 10Z" fill="#f4b740" />
    </svg>
  );
}

/** Just the gold four-point star, cropped tight, for use as a bullet. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="26 10 28 28" aria-hidden className={className}>
      <path d="M40 10C41 20 44 23 54 24C44 25 41 28 40 38C39 28 36 25 26 24C36 23 39 20 40 10Z" fill="#f4b740" />
    </svg>
  );
}
