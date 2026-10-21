import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteUrl, wishPath } from "@/lib/site";

// Shared frame for the 1200×630 share cards under /api/og. Satori renders a
// subset of CSS: every element with more than one child needs display: flex.

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Newsreader-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
]);

// Cards are night blue, so these are the colours for text on night.
export const NIGHT = "#1d1b45";
export const GOLD = "#f4b740";
export const INK = "#fbf8f1";
export const MUTED = "#c9c6e6";
export const SUBTLE = "#9d9ac0";
export const CRAFT = GOLD;
export const DOT = "#4a4878";

export function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function avatarDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const src = new URL(url);
    src.searchParams.set("s", "96");
    const res = await fetch(src, { signal: AbortSignal.timeout(2500) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Wish text sizes for the main quote and for a secondary one under a headline. */
export function quoteSize(text: string, secondary = false) {
  const step = text.length > 140 ? 2 : text.length > 90 ? 1 : 0;
  return (secondary ? [40, 34, 30] : [64, 56, 48])[step];
}

export async function cardResponse(element: React.ReactElement) {
  const [serif, sans, sansBold] = await fonts;
  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Newsreader", data: serif, weight: 500, style: "normal" },
      { name: "Inter", data: sans, weight: 500, style: "normal" },
      { name: "Inter", data: sansBold, weight: 700, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" },
  });
}

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: NIGHT, padding: 64, fontFamily: "Inter" }}>
      {children}
    </div>
  );
}

/** The shooting star, without its square (the card is already night). */
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d="M40 10C41 20 44 23 54 24C44 25 41 28 40 38C39 28 36 25 26 24C36 23 39 20 40 10Z" fill={GOLD} />
      <path d="M30 34L24 40" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <path d="M20 44L17 47" stroke={GOLD} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <circle cx="13" cy="51" r="2" fill={GOLD} opacity="0.45" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Mark size={60} />
      <div style={{ fontFamily: "Newsreader", fontSize: 34, color: INK, letterSpacing: -0.5 }}>Wishcode</div>
    </div>
  );
}

export function Chip({ label, bg, fg, border }: { label: string; bg: string; fg: string; border: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", borderRadius: 999, background: bg, color: fg, border: `2px solid ${border}`, fontSize: 24, fontWeight: 700 }}>
      {label}
    </div>
  );
}

/** "✓ Confirmed by …", or nothing. */
export function Stamp({ text }: { text: string | null }) {
  if (!text) return null;
  return <Chip label={text} bg="#1f3b45" fg="#9be3bb" border="#2c6b5a" />;
}

export function Avatar({ src, size }: { src: string | null; size: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
  return <img src={src} width={size} height={size} style={{ borderRadius: 999 }} alt="" />;
}

export function Dot() {
  return <span style={{ color: DOT }}>•</span>;
}

/** Bottom rule: `left` (domain, counts) and the wish's short URL. */
export function Footer({ wishId, children }: { wishId: number; children?: React.ReactNode }) {
  const host = new URL(siteUrl()).host;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #3a3870", paddingTop: 28, fontSize: 26, color: MUTED }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{children}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: SUBTLE }}>
        <Mark size={30} />
        {host}
        {wishPath(wishId)}
      </div>
    </div>
  );
}
