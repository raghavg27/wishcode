import { describe, expect, it } from "vitest";
import { signLinkToken, verifyLinkToken } from "../email-token";
import { buildVerifiedEmail } from "../verified-email";

const SECRET = "test-secret";

describe("buildVerifiedEmail", () => {
  const token = signLinkToken(99, SECRET);
  const base = {
    wishText: "An app that <b>mutes</b> my mic & more",
    wishUrl: "https://wishcode.example/w/12",
    shareUrl: "https://wishcode.example/w/12/by/alice",
    linkUrl: "https://barkmute.app/?a=1&b=2",
    wisherVerdict: true,
    worksCount: 0,
    token,
  };

  it("says who confirmed it", () => {
    expect(buildVerifiedEmail(base).subject).toBe("Your build was verified");
    expect(buildVerifiedEmail(base).text).toContain("✓ Confirmed by the wisher");
    const crowd = buildVerifiedEmail({ ...base, wisherVerdict: false, worksCount: 1200 });
    expect(crowd.text).toContain("✓ Confirmed by 1,200 people");
    expect(crowd.html).toContain("✓ Confirmed by 1,200 people");
  });

  it("links to the share page, the wish and the build", () => {
    const { text, html } = buildVerifiedEmail(base);
    expect(text).toContain("https://wishcode.example/w/12/by/alice");
    expect(text).toContain("https://wishcode.example/w/12\n");
    expect(text).toContain("https://barkmute.app/?a=1&b=2");
    expect(html).toContain('href="https://wishcode.example/w/12/by/alice"');
  });

  it("stops all email with a link token on the wish's origin", () => {
    const { text, html, headers } = buildVerifiedEmail(base);
    const stop = `https://wishcode.example/e/unsubscribe?d=${token}`;
    expect(text).toContain(`Stop all Wishcode emails: ${stop}`);
    expect(html).toContain(`href="${stop}"`);
    expect(headers["List-Unsubscribe"]).toBe(`<${stop}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(verifyLinkToken(new URL(stop).searchParams.get("d"), SECRET)).toBe(99);
  });

  it("escapes the wish text and URLs in HTML", () => {
    const { html, text } = buildVerifiedEmail(base);
    expect(html).not.toContain("<b>mutes</b>");
    expect(html).toContain("An app that &lt;b&gt;mutes&lt;/b&gt; my mic &amp; more");
    expect(html).toContain('href="https://barkmute.app/?a=1&amp;b=2"');
    expect(text).toContain("An app that <b>mutes</b> my mic & more");
  });
});
