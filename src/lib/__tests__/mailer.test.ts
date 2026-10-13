import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const createTransport = vi.fn();
vi.mock("nodemailer", () => ({ default: { createTransport } }));

describe("sendMail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("resolves without sending when Gmail isn't configured", async () => {
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendMail } = await import("../mailer");
    const mail = { to: "a@example.com", subject: "s", text: "t", html: "<p>t</p>" };
    await expect(sendMail(mail)).resolves.toBeUndefined();
    await expect(sendMail(mail)).resolves.toBeUndefined();
    expect(createTransport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
