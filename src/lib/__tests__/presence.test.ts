import { describe, expect, it } from "vitest";
import { badgeCount, visitorCount } from "../presence";

const tab = { presence_ref: "x" };

describe("visitorCount", () => {
  it("counts each browser once, however many tabs it has open", () => {
    expect(visitorCount({})).toBe(0);
    expect(visitorCount({ a: [tab, tab, tab] })).toBe(1);
    expect(visitorCount({ a: [tab], b: [tab, tab] })).toBe(2);
  });

  it("ignores keys with no tabs left", () => {
    expect(visitorCount({ a: [tab], b: [] })).toBe(1);
  });
});

describe("badgeCount", () => {
  it("hides the badge until someone else is here", () => {
    expect(badgeCount({})).toBeNull();
    expect(badgeCount({ a: [tab, tab] })).toBeNull();
    expect(badgeCount({ a: [tab], b: [tab] })).toBe(2);
    expect(badgeCount({ a: [tab], b: [tab], c: [tab] })).toBe(3);
  });
});
