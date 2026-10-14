import { afterEach, describe, expect, it, vi } from "vitest";

const confetti = vi.fn();
const loaded = vi.fn();
vi.mock("canvas-confetti", () => {
  loaded();
  return { default: confetti };
});

function stubMotion(reduce: boolean) {
  vi.stubGlobal("window", { matchMedia: (q: string) => ({ matches: reduce && q === "(prefers-reduced-motion: reduce)" }) });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  confetti.mockClear();
  loaded.mockClear();
});

describe("celebrate", () => {
  it("never loads canvas-confetti when reduced motion is on", async () => {
    stubMotion(true);
    const { celebrate } = await import("../celebrate");
    await celebrate();
    expect(loaded).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
  });

  it("fires one burst from each bottom corner, angled inward", async () => {
    stubMotion(false);
    const { celebrate } = await import("../celebrate");
    await celebrate();
    expect(confetti).toHaveBeenCalledTimes(2);
    const [left, right] = confetti.mock.calls.map(([opts]) => opts);
    expect(left.origin).toEqual({ x: 0, y: 1 });
    expect(right.origin).toEqual({ x: 1, y: 1 });
    expect(left.angle).toBeLessThan(90);
    expect(right.angle).toBeGreaterThan(90);
    expect(left.particleCount + right.particleCount).toBe(80);
    expect(left.disableForReducedMotion).toBe(true);
  });

  it("does nothing on the server", async () => {
    const { celebrate } = await import("../celebrate");
    await celebrate();
    expect(loaded).not.toHaveBeenCalled();
  });
});
