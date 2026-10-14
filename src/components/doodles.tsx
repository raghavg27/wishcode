// Tiny line drawings for empty states. Each is a 64×64 outline in
// currentColor, decorative only (the title next to it carries the meaning).

type DoodleProps = { className?: string };

function Doodle({ className, children }: DoodleProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** An unlit genie lamp. */
export function Lamp(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M14 38c0 6 8 9 18 9s16-4 18-9H14z" />
      <path d="M50 38c4-1 7-4 8-8l-6 2" />
      <path d="M14 38c-4 0-7-3-7-6s3-5 6-4" />
      <path d="M24 38c0-5 4-8 8-8s8 3 8 8" />
      <path d="M32 30v-3" />
      <path d="M26 47l-2 5h16l-2-5" />
    </Doodle>
  );
}

/** An empty in-tray. */
export function Inbox(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M10 36l8-18h28l8 18v12H10V36z" />
      <path d="M10 36h14l3 5h10l3-5h14" />
      <path d="M26 26h12" />
    </Doodle>
  );
}

/** A closed laptop, idle. */
export function Laptop(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M12 40l4-6h32l4 6H12z" />
      <path d="M12 40v3h40v-3" />
      <path d="M29 37h6" />
      <path d="M44 22h4l-4 5h4" />
      <path d="M52 14h3l-3 4h3" />
    </Doodle>
  );
}

/** A tumbleweed rolling past. */
export function Tumbleweed(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <circle cx="36" cy="34" r="12" />
      <path d="M28 26c6 4 10 10 12 18" />
      <path d="M44 28c-6 2-12 8-14 14" />
      <path d="M26 36c6-2 14-2 20 2" />
      <path d="M6 30h10M10 38h8M4 46h52" />
    </Doodle>
  );
}

/** A blank sticky note with a curled corner. */
export function StickyNote(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M16 14h32v26l-10 10H16V14z" />
      <path d="M48 40H38v10" />
      <path d="M24 12v5M40 12v5" />
    </Doodle>
  );
}

/** A magnifying glass over nothing. */
export function Magnifier(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <circle cx="28" cy="28" r="13" />
      <path d="M37.5 37.5L52 52" />
      <path d="M21 24c1-3 4-5 7-5" />
      <path d="M12 54h8M44 12h6" />
    </Doodle>
  );
}
