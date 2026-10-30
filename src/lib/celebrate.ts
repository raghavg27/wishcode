// Confetti for posting a wish and the three "it came true" moments. canvas-confetti is imported
// on demand so it never ships in a page's initial bundle.

const COLORS = ["#f4b740", "#1a7d52", "#1d1b45"]; // gold, leaf, night

/** `particleCount` is per corner; posting a wish passes a bigger burst. */
export async function celebrate(particleCount = 40): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const burst = { particleCount, spread: 60, startVelocity: 55, colors: COLORS, disableForReducedMotion: true };
  void confetti({ ...burst, angle: 60, origin: { x: 0, y: 1 } });
  void confetti({ ...burst, angle: 120, origin: { x: 1, y: 1 } });
}
