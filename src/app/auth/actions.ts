"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/redirect";
import { siteUrl } from "@/lib/site";
import { createAuthClient } from "@/lib/supabase/server";

// The OAuth return address. Without SITE_URL it follows the Host header, so
// previews and local ports sign in to themselves; Host is what routed the
// request here, unlike X-Forwarded-Host, which the client can set.
async function origin() {
  if (process.env.SITE_URL) return siteUrl();
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : siteUrl();
}

export async function signInWithGithub(formData: FormData) {
  const next = safeNext(formData.get("next")?.toString());
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    // Supabase's default GitHub scope (user:email) only; no repo access.
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    console.error("[auth] signInWithOAuth failed", error);
    redirect(`/login?error=unavailable&next=${encodeURIComponent(next)}`);
  }
  redirect(data.url);
}
