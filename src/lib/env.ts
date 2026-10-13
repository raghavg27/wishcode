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
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  /** sb_secret_… key (or legacy service_role JWT). Server only. */
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  /** Pepper for hashing client IPs into rate-limit keys. */
  get rateLimitSalt() {
    return process.env.RATE_LIMIT_SALT || required("SUPABASE_SECRET_KEY");
  },
  /** OpenAI-compatible embeddings endpoint. Optional: falls back to trigram matching. */
  embeddings: {
    get apiKey() {
      return process.env.EMBEDDINGS_API_KEY || process.env.OPENAI_API_KEY || "";
    },
    get baseUrl() {
      return (process.env.EMBEDDINGS_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    },
    get model() {
      return process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";
    },
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
