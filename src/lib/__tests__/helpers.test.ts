import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../cursor";
import { durationBetween, relativeTime, weekDeltaText } from "../format";
import { safeNext } from "../redirect";
import type { WishCard } from "../types";

const wish = { id: 42, metoo_count: 7, created_at: "2026-10-10T10:00:00.000Z" } as WishCard;

describe("cursor", () => {
  it("round-trips per sort", () => {
    expect(decodeCursor("newest", encodeCursor("newest", wish))).toEqual({ id: 42, ts: wish.created_at });
    expect(decodeCursor("top", encodeCursor("top", wish))).toEqual({ id: 42, count: 7 });
  });

  it("rejects garbage and mismatched sorts", () => {
    expect(decodeCursor("newest", "not-base64!")).toBeNull();
    expect(decodeCursor("top", encodeCursor("newest", wish))).toBeNull();
    expect(decodeCursor("newest", Buffer.from('{"id":-1,"ts":"x"}').toString("base64url"))).toBeNull();
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/w/12?intent=link")).toBe("/w/12?intent=link");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});

describe("format", () => {
  const now = Date.parse("2026-10-13T10:00:00Z");
  it("formats relative times", () => {
    expect(relativeTime("2026-10-13T09:59:50Z", now)).toBe("just now");
    expect(relativeTime("2026-10-13T07:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-10-12T09:00:00Z", now)).toBe("yesterday");
    expect(relativeTime("2026-10-06T10:00:00Z", now)).toBe("1 week ago");
  });
  it("formats durations", () => {
    expect(durationBetween("2026-10-10T00:00:00Z", "2026-10-11T10:00:00Z")).toBe("34 hours");
    expect(durationBetween("2026-10-10T00:00:00Z", "2026-10-12T10:00:00Z")).toBe("2 days");
    expect(durationBetween("2026-10-10T00:00:00Z", "2026-10-10T00:20:00Z")).toBe("20 minutes");
  });
});

describe("weekDeltaText", () => {
  it("says more, fewer or the same in plain words", () => {
    expect(weekDeltaText(112, 100)).toBe("12% more wishes than last week");
    expect(weekDeltaText(92, 100)).toBe("8% fewer wishes than last week");
    expect(weekDeltaText(100, 100)).toBe("Same as last week");
  });

  it("is null without a previous week to compare", () => {
    expect(weekDeltaText(5, 0)).toBeNull();
  });
});
