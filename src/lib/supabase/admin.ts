import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. The database grants nothing to anon/authenticated, so
 * every read and write goes through this client from the server, after the
 * caller's device cookie or developer session has been checked.
 */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { schema: "public" },
    });
  }
  return client;
}
