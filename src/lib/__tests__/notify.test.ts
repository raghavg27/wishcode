import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyEmailToken } from "../email-token";

vi.mock("server-only", () => ({}));
const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ db: () => ({ rpc }) }));
const sendMail = vi.fn();
vi.mock("@/lib/mailer", () => ({ sendMail }));

const notification = {
  wish_id: 12,
  wish_text: "An app that mutes my mic when my dog barks",
  link_id: 99,
  link_url: "https://barkmute.app",
  description: "Mutes the mic",
  handle: "alice",
  recipients: [
    { subscription_id: 1, email: "wisher@example.com", is_wisher: true },
    { subscription_id: 2, email: "fan@example.com", is_wisher: false },
    { subscription_id: 3, email: "other@example.com", is_wisher: false },
  ],
};

describe("notifyLinkPosted", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    rpc.mockReset();
    sendMail.mockReset();
  });

  it("emails every recipient and logs failures without the address", async () => {
    vi.stubEnv("SITE_URL", "https://wishcode.example");
    vi.stubEnv("EMAIL_TOKEN_SECRET", "secret");
    rpc.mockResolvedValue({ data: notification, error: null });
    const smtpError = Object.assign(new Error("550 fan@example.com rejected"), { code: "EENVELOPE", responseCode: 550 });
    sendMail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(smtpError).mockResolvedValueOnce(undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const { notifyLinkPosted } = await import("../notify");
    await notifyLinkPosted(99);

    expect(rpc).toHaveBeenCalledWith("link_notification", { p_link_id: 99 });
    expect(sendMail).toHaveBeenCalledTimes(3);
    const [first, second] = sendMail.mock.calls.map((c) => c[0]);
    expect(first.to).toBe("wisher@example.com");
    expect(first.subject).toBe("Someone built your wish");
    expect(second.subject).toBe("Someone built a wish you wanted");
    expect(first.text).toContain("https://wishcode.example/w/12");
    const token = new URL(first.headers["List-Unsubscribe"].slice(1, -1)).searchParams.get("t");
    expect(verifyEmailToken(token, "secret")).toBe(1);

    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).not.toContain("fan@example.com");
    expect(error.mock.calls[0][1]).toMatchObject({ subscriptionId: 2, code: "EENVELOPE", responseCode: 550 });
  });

  it("sends nothing when there are no recipients", async () => {
    rpc.mockResolvedValue({ data: { ...notification, recipients: [] }, error: null });
    const { notifyLinkPosted } = await import("../notify");
    await notifyLinkPosted(99);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
