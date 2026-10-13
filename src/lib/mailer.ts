import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

// The only module that knows about SMTP. Without Gmail credentials (dev,
// previews, tests) sendMail logs once and sends nothing.

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
let warned = false;

export async function sendMail(mail: Mail): Promise<void> {
  const user = env.gmailUser;
  const pass = env.gmailAppPassword;
  if (!user || !pass) {
    if (!warned) {
      warned = true;
      console.warn("[mailer] GMAIL_USER or GMAIL_APP_PASSWORD is not set; emails are not sent.");
    }
    return;
  }
  transport ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transport.sendMail({ from: { name: "Wishcode", address: user }, ...mail });
}
