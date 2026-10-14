import { describe, expect, it } from "vitest";
import {
  cardFilename,
  confirmedStamp,
  developerHeadline,
  liveLinkBy,
  peopleCount,
  shareText,
  wisherCardLink,
} from "../share-copy";

describe("peopleCount", () => {
  it("adds the wisher to the me-toos", () => {
    expect(peopleCount(0)).toBe(1);
    expect(peopleCount(213)).toBe(214);
  });
});

describe("developerHeadline", () => {
  it("names the count from 5 people", () => {
    expect(developerHeadline(4)).toBe("I made someone's wish come true.");
    expect(developerHeadline(5)).toBe("I built what 5 people wished for.");
    expect(developerHeadline(214)).toBe("I built what 214 people wished for.");
    expect(developerHeadline(1234)).toBe("I built what 1,234 people wished for.");
  });
});

describe("confirmedStamp", () => {
  it("credits the wisher first", () => {
    expect(confirmedStamp({ verdict: "verified", wisher_verdict: true, works_count: 7 })).toBe("✓ Confirmed by the wisher");
  });

  it("counts the crowd", () => {
    expect(confirmedStamp({ verdict: "verified", wisher_verdict: null, works_count: 4 })).toBe("✓ Confirmed by 4 people");
  });

  it("prints nothing for unverified or flagged links", () => {
    expect(confirmedStamp({ verdict: "unverified", wisher_verdict: null, works_count: 2 })).toBeNull();
    expect(confirmedStamp({ verdict: "flagged", wisher_verdict: false, works_count: 0 })).toBeNull();
  });
});

describe("shareText", () => {
  const wish = "I wish there was an app that mutes my mic when my dog barks";

  it("leads with the count for developers", () => {
    expect(shareText({ variant: "developer", wishText: wish, people: 214, handle: "priya" })).toBe(
      `I built what 214 people wished for: “${wish}”`,
    );
  });

  it("falls back under 5 people", () => {
    expect(shareText({ variant: "developer", wishText: wish, people: 2, handle: "priya" })).toBe(
      `I made someone's wish come true: “${wish}”`,
    );
  });

  it("credits the builder for wishers", () => {
    expect(shareText({ variant: "wisher", wishText: wish, people: 214, handle: "priya" })).toBe(
      `My wish came true: “${wish}”, built by @priya`,
    );
  });
});

describe("cardFilename", () => {
  it("names each card", () => {
    expect(cardFilename(42)).toBe("wishcode-42.png");
    expect(cardFilename(42, "priya")).toBe("wishcode-42-priya.png");
  });
});

const dev = (handle: string) => ({ id: handle, handle, avatar_url: null });
const link = (id: number, handle: string, created_at: string, extra: Partial<{ verdict: string; wisher_verdict: boolean | null }> = {}) => ({
  id,
  created_at,
  verdict: "unverified" as const,
  wisher_verdict: null,
  developer: dev(handle),
  ...extra,
});

describe("liveLinkBy", () => {
  it("matches the handle case-insensitively and skips flagged links", () => {
    const links = [link(1, "Priya", "2026-10-01"), link(2, "sam", "2026-10-02", { verdict: "flagged" })];
    expect(liveLinkBy(links as never, "priya")?.id).toBe(1);
    expect(liveLinkBy(links as never, "sam")).toBeUndefined();
    expect(liveLinkBy(links as never, "nobody")).toBeUndefined();
  });
});

describe("wisherCardLink", () => {
  it("uses the earliest link the wisher confirmed", () => {
    const links = [
      link(3, "late", "2026-10-03", { verdict: "verified", wisher_verdict: true }),
      link(1, "early", "2026-10-01", { verdict: "verified", wisher_verdict: true }),
      link(2, "unconfirmed", "2026-10-02"),
    ];
    expect(wisherCardLink(links as never)?.id).toBe(1);
  });

  it("can count a link the wisher is confirming right now", () => {
    const links = [link(2, "b", "2026-10-02", { verdict: "verified", wisher_verdict: true }), link(1, "a", "2026-10-01")];
    expect(wisherCardLink(links as never)?.id).toBe(2);
    expect(wisherCardLink(links as never, 1)?.id).toBe(1);
  });

  it("is undefined until the wisher confirms one", () => {
    expect(wisherCardLink([link(1, "a", "2026-10-01")] as never)).toBeUndefined();
  });
});
