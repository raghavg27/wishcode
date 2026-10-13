import { describe, expect, it } from "vitest";
import { charLength, normalizeWishText, urlIssue, validateLinkInput, wishTextIssue } from "../validation";

describe("wish text", () => {
  it("normalizes whitespace and strips control/bidi characters", () => {
    expect(normalizeWishText("  An app\n\nthat\t does‮ things \u0007 ")).toBe("An app that does things");
  });

  it("enforces 20–200 code points", () => {
    expect(wishTextIssue("too short")).toBe("too_short");
    expect(wishTextIssue("a".repeat(20))).toBeNull();
    expect(wishTextIssue("a".repeat(200))).toBeNull();
    expect(wishTextIssue("a".repeat(201))).toBe("too_long");
  });

  it("counts emoji as single characters like Postgres char_length", () => {
    expect(charLength("🐶🐶")).toBe(2);
  });
});

describe("urls", () => {
  it("accepts https only", () => {
    expect(urlIssue("https://barkmute.app")).toBeNull();
    expect(urlIssue("https://barkmute.app/path?q=1#x")).toBeNull();
    expect(urlIssue("http://barkmute.app")).toBe("not_https");
    expect(urlIssue("barkmute.app")).toBe("not_https");
    expect(urlIssue("javascript:alert(1)")).toBe("invalid");
    expect(urlIssue("https://localhost")).toBe("invalid");
    expect(urlIssue("https://user:pass@evil.com")).toBe("invalid");
    expect(urlIssue("")).toBe("required");
    expect(urlIssue(`https://a.co/${"x".repeat(2050)}`)).toBe("too_long");
  });

  it("validates the full link form", () => {
    const ok = validateLinkInput({ url: " https://a.app ", description: "  Does  it ", repoUrl: "" });
    expect(ok.issues).toEqual({});
    expect(ok.value).toEqual({ url: "https://a.app", description: "Does it", repoUrl: null });

    const bad = validateLinkInput({ url: "http://a.app", description: "x".repeat(141), repoUrl: "http://github.com/a" });
    expect(Object.keys(bad.issues).sort()).toEqual(["description", "repoUrl", "url"]);
  });
});
