import { describe, expect, it } from "vitest";
import { posthogUiHost, posthogUpstream } from "@/lib/posthog";

describe("posthogUpstream", () => {
  it("sends events to the ingest host, keeping the trailing slash", () => {
    expect(posthogUpstream("/relay/e/", "https://us.i.posthog.com").href).toBe("https://us.i.posthog.com/e/");
  });

  it("sends the SDK's files to the assets host", () => {
    expect(posthogUpstream("/relay/static/array.js", "https://eu.i.posthog.com").href).toBe(
      "https://eu-assets.i.posthog.com/static/array.js",
    );
    expect(posthogUpstream("/relay/array/phc_x/config.js", "https://us.i.posthog.com").href).toBe(
      "https://us-assets.i.posthog.com/array/phc_x/config.js",
    );
  });

  it("sends everything to a self-hosted PostHog", () => {
    expect(posthogUpstream("/relay/static/array.js", "https://ph.example.com").href).toBe(
      "https://ph.example.com/static/array.js",
    );
  });
});

describe("posthogUiHost", () => {
  it("maps PostHog Cloud ingest hosts to the app", () => {
    expect(posthogUiHost("https://us.i.posthog.com")).toBe("https://us.posthog.com");
    expect(posthogUiHost("https://eu.i.posthog.com")).toBe("https://eu.posthog.com");
  });

  it("keeps a self-hosted PostHog as is", () => {
    expect(posthogUiHost("https://ph.example.com")).toBe("https://ph.example.com");
  });
});
