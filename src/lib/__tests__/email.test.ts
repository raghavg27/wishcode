import { describe, expect, it } from "vitest";
import { signEmailToken, signLinkToken, verifyEmailToken, verifyLinkToken } from "../email-token";
import { buildLinkEmail } from "../link-email";
import { emailIssue, normalizeEmail } from "../validation";

const SECRET = "test-secret";

describe("email addresses", () => {
  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeEmail("  Ada@Example.COM \n")).toBe("ada@example.com");
  });

  it("validates shape and length", () => {
    expect(emailIssue("")).toBe("required");
    expect(emailIssue("ada@example.com")).toBeNull();
    expect(emailIssue("ada@example")).toBe("invalid");
    expect(emailIssue("ada example@x.com")).toBe("invalid");
    expect(emailIssue("a@b@c.com")).toBe("invalid");
    expect(emailIssue(`${"a".repeat(245)}@example.com`)).toBe("too_long");
  });
});

describe("email tokens", () => {
  it("round-trips the subscription id", () => {
    const token = signEmailToken(42, SECRET);
    expect(token).toMatch(/^42\.[A-Za-z0-9_-]{43}$/);
    expect(verifyEmailToken(token, SECRET)).toBe(42);
  });

  it("rejects a tampered signature", () => {
    const token = signEmailToken(42, SECRET);
    const last = token.at(-1) === "A" ? "B" : "A";
    expect(verifyEmailToken(token.slice(0, -1) + last, SECRET)).toBeNull();
  });

  it("rejects a signature for another id or another secret", () => {
    const sig = signEmailToken(42, SECRET).split(".")[1];
    expect(verifyEmailToken(`43.${sig}`, SECRET)).toBeNull();
    expect(verifyEmailToken(signEmailToken(42, "other"), SECRET)).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of [undefined, null, 42, "", "42", "42.", ".abc", "0.abc", "-1.abc", "42.short", "x.y"]) {
      expect(verifyEmailToken(bad, SECRET)).toBeNull();
      expect(verifyLinkToken(bad, SECRET)).toBeNull();
    }
  });
});

describe("developer email tokens", () => {
  it("round-trips the link id", () => {
    const token = signLinkToken(99, SECRET);
    expect(token).toMatch(/^99\.[A-Za-z0-9_-]{43}$/);
    expect(verifyLinkToken(token, SECRET)).toBe(99);
  });

  it("can't be swapped with a subscription token", () => {
    expect(verifyLinkToken(signEmailToken(99, SECRET), SECRET)).toBeNull();
    expect(verifyEmailToken(signLinkToken(99, SECRET), SECRET)).toBeNull();
  });
});

describe("buildLinkEmail", () => {
  const token = signEmailToken(7, SECRET);
  const base = {
    wishText: "An app that <b>mutes</b> my mic & more",
    wishUrl: "https://wishcode.example/w/12",
    linkId: 99,
    linkUrl: "https://barkmute.app/?a=1&b=2",
    description: `Mutes the mic "instantly" <script>`,
    handle: "alice",
    isWisher: true,
    token,
  };

  it("picks the subject for wisher vs me-too-er", () => {
    expect(buildLinkEmail(base).subject).toBe("Someone built your wish");
    expect(buildLinkEmail({ ...base, isWisher: false }).subject).toBe("Someone built a wish you wanted");
  });

  it("links carry a valid token on the wish's origin", () => {
    const { text, headers } = buildLinkEmail(base);
    const urls = text.match(/https:\/\/wishcode\.example\/e\/[^\s]+/g) ?? [];
    expect(urls).toHaveLength(4);
    for (const u of urls) {
      expect(verifyEmailToken(new URL(u).searchParams.get("t"), SECRET)).toBe(7);
    }
    expect(text).toContain("/e/verdict?t=");
    expect(text).toContain("&link=99&works=1");
    expect(text).toContain("&link=99&works=0");
    expect(text).toContain("/e/unsubscribe?t=");
    expect(text).toContain("&all=1");
    expect(headers["List-Unsubscribe"]).toBe(`<https://wishcode.example/e/unsubscribe?t=${token}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("escapes the wish text and description in HTML", () => {
    const { html, text } = buildLinkEmail(base);
    expect(html).not.toContain("<b>mutes</b>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("An app that &lt;b&gt;mutes&lt;/b&gt; my mic &amp; more");
    expect(html).toContain("Mutes the mic &quot;instantly&quot; &lt;script&gt;");
    expect(html).toContain('href="https://barkmute.app/?a=1&amp;b=2"');
    // The plain-text part is the raw text.
    expect(text).toContain("An app that <b>mutes</b> my mic & more");
    expect(text).toContain("@alice built it:");
  });
});
