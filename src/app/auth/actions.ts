"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/redirect";
import { siteUrl } from "@/lib/site";
import { createAuthClient } from "@/lib/supabase/server";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return siteUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
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
