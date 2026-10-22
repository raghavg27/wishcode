import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { turnstileEnabled, verifyTurnstile } = await import("../turnstile");

function siteverify(body: object, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("verifyTurnstile", () => {
  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is off, and passes everything, without a secret", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(turnstileEnabled()).toBe(false);
    await expect(verifyTurnstile("", "post_wish")).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the secret and token, and accepts a token for this action", async () => {
    const fetch = siteverify({ success: true, action: "post_wish" });
    await expect(verifyTurnstile("tok", "post_wish")).resolves.toBe(true);
    const body = fetch.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("secret")).toBe("secret");
    expect(body.get("response")).toBe("tok");
  });

  it("rejects tokens Cloudflare rejects or that were made for another action", async () => {
    siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    await expect(verifyTurnstile("tok", "post_wish")).resolves.toBe(false);
    siteverify({ success: true, action: "login" });
    await expect(verifyTurnstile("tok", "post_wish")).resolves.toBe(false);
  });

  it("fails open when Cloudflare can't be reached", async () => {
    siteverify({}, 503);
    await expect(verifyTurnstile("tok", "post_wish")).resolves.toBe(true);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("timeout"));
    await expect(verifyTurnstile("tok", "post_wish")).resolves.toBe(true);
  });
});
