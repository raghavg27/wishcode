import { describe, expect, it } from "vitest";
import { llmsFullTxt, llmsTxt } from "../llms";
import { PRINCIPLES } from "../principles";
import type { WishCard } from "../types";

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

function card(overrides: Partial<WishCard>): WishCard {
  return {
    id: 7,
    text: "An app that mutes my mic when the dog barks",
    status: "open",
    verified: false,
    metoo_count: 12,
    claim_count: 0,
    link_count: 0,
    live_link_count: 0,
    created_at: "2026-10-01T00:00:00Z",
    fulfilled_at: null,
    removed: false,
    first_link: null,
    builders: [],
    ...overrides,
  };
}

describe("llmsFullTxt", () => {
  it("includes the principles", () => {
    const text = llmsFullTxt(base, { top: null, newest: null });
    for (const p of PRINCIPLES) expect(text).toContain(`### ${p.title}`);
  });

  it("lists wishes with links, me-too counts and status", () => {
    const text = llmsFullTxt(base, {
      top: [card({}), card({ id: 8, text: "One me-too app idea", metoo_count: 1, status: "fulfilled" })],
      newest: [card({ id: 9, status: "fulfilled", verified: true })],
    });
    expect(text).toContain(`## Most-wanted app ideas\n\n- [An app that mutes my mic when the dog barks](${base}/w/7): 12 me-toos, open`);
    expect(text).toContain(`(${base}/w/8): 1 me-too, fulfilled, unverified`);
    expect(text).toContain(`## Newest app ideas`);
    expect(text).toContain(`(${base}/w/9): 12 me-toos, fulfilled\n`);
  });

  it("skips removed wishes and empty sections", () => {
    const text = llmsFullTxt(base, { top: [card({ text: null, removed: true })], newest: null });
    expect(text).not.toContain("## Most-wanted app ideas");
    expect(text).not.toContain("## Newest app ideas");
  });

  it("keeps wish text from breaking the link", () => {
    const text = llmsFullTxt(base, { top: [card({ text: "An app [beta]\nthat ends](x)" })], newest: null });
    expect(text).toContain(`- [An app \\[beta\\] that ends\\](x)](${base}/w/7)`);
  });
});
