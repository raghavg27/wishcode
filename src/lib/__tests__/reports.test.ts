import { describe, expect, it } from "vitest";
import { isReportReason, reportReasonsFor } from "../reports";

describe("report reasons", () => {
  it("only offers malicious_link for links, first", () => {
    expect(reportReasonsFor("wish")).not.toContain("malicious_link");
    expect(reportReasonsFor("link")[0]).toBe("malicious_link");
    expect(reportReasonsFor("link")).toEqual(expect.arrayContaining(reportReasonsFor("wish")));
  });

  it("accepts only known reasons", () => {
    expect(isReportReason("spam")).toBe(true);
    expect(isReportReason("toString")).toBe(false);
    expect(isReportReason("broken")).toBe(false);
    expect(isReportReason(null)).toBe(false);
  });
});
