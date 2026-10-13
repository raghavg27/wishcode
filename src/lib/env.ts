import "server-only";

// Server-side environment, read lazily so a missing optional variable never
// breaks unrelated routes. Required variables throw a clear error on use.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See README.md#environment.`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("SUPABASE_PUBLISHABLE_KEY");
  },
  /** sb_secret_… key (or legacy service_role JWT). Server only. */
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  /** Pepper for hashing client IPs into rate-limit keys. */
  get rateLimitSalt() {
    return process.env.RATE_LIMIT_SALT || required("SUPABASE_SECRET_KEY");
  },
  /**
   * Name of the deployed gte-small Edge Function (supabase/functions/embed).
   * Optional: unset means duplicate suggestions use trigram matching only.
   */
  get embeddingsFunction() {
    return process.env.EMBEDDINGS_FUNCTION || "";
  },
  /** Gmail account that sends notification emails. Unset: emails are skipped. */
  get gmailUser() {
    return process.env.GMAIL_USER || "";
  },
  /** Google App Password for GMAIL_USER (needs 2-Step Verification). */
  get gmailAppPassword() {
    return process.env.GMAIL_APP_PASSWORD || "";
  },
  /** Key for signing the links in emails (defaults to the secret key). */
  get emailTokenSecret() {
    return process.env.EMAIL_TOKEN_SECRET || required("SUPABASE_SECRET_KEY");
  },
  /** Comma-separated GitHub handles that get admin rights on sign-in. */
  get adminHandles(): Set<string> {
    return new Set(
      (process.env.ADMIN_GITHUB_HANDLES || "")
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    );
  },
};
