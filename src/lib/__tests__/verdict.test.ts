import { describe, expect, it } from "vitest";
import { computeVerdict, verdictCountsText } from "../verdict";

describe("computeVerdict", () => {
  it("lets the wisher override the crowd", () => {
    expect(computeVerdict(true, 0, 5)).toBe("verified");
    expect(computeVerdict(false, 5, 0)).toBe("flagged");
  });

  it("needs 3 votes and leans toward flagged on a tie", () => {
    expect(computeVerdict(null, 2, 0)).toBe("unverified");
    expect(computeVerdict(null, 3, 0)).toBe("verified");
    expect(computeVerdict(null, 3, 3)).toBe("flagged");
    expect(computeVerdict(null, 4, 3)).toBe("verified");
    expect(computeVerdict(null, 2, 2)).toBe("unverified");
  });
});

describe("verdictCountsText", () => {
  it("describes the votes", () => {
    expect(verdictCountsText(0, 0)).toBeNull();
    expect(verdictCountsText(3, 1)).toBe("3 say it works · 1 says it doesn't");
    expect(verdictCountsText(1, 0)).toBe("1 says it works");
    expect(verdictCountsText(0, 2)).toBe("2 say it doesn't");
  });
});
