import { describe, expect, it } from "vitest";
import { llmsTxt } from "../llms";

const base = "https://wishcode.example";

describe("llmsTxt", () => {
  it("starts with the site name and a summary quote", () => {
    const lines = llmsTxt(base).split("\n");
    expect(lines[0]).toBe("# Wishcode");
    expect(lines[2]).toMatch(/^> /);
  });

  it("links pages with absolute URLs", () => {
    const text = llmsTxt(base);
    expect(text).toContain(`(${base}/wishes?sort=top)`);
    expect(text).toContain(`(${base}/llms-full.txt)`);
    expect(text).not.toMatch(/\]\(\//);
  });
});
