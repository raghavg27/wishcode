// Confetti for the three "it came true" moments. canvas-confetti is imported
// on demand so it never ships in a page's initial bundle.

const COLORS = ["#f5a524", "#1f9d55", "#1e1b19"]; // amber, leaf, ink

export async function celebrate(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const burst = { particleCount: 40, spread: 60, startVelocity: 55, colors: COLORS, disableForReducedMotion: true };
  void confetti({ ...burst, angle: 60, origin: { x: 0, y: 1 } });
  void confetti({ ...burst, angle: 120, origin: { x: 1, y: 1 } });
}
