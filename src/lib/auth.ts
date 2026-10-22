import "server-only";
import { cache } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { GITHUB_HANDLE, isGithubAvatar } from "@/lib/site";
import { db } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

type GithubIdentityData = {
  user_name?: string;
  preferred_username?: string;
  avatar_url?: string;
  provider_id?: string;
  sub?: string;
};

/**
 * The GitHub account behind a Supabase Auth identity. Reads identity_data,
 * which Supabase Auth fills from GitHub at sign-in. Never user_metadata: its
 * owner can rewrite it (auth.updateUser), so it can't say who someone is.
 */
export function githubIdentity(identity: Pick<UserIdentity, "provider" | "identity_data"> | undefined) {
  if (identity?.provider !== "github") return null;
  const data = identity.identity_data as GithubIdentityData | undefined;
  const handle = data?.user_name || data?.preferred_username;
  const githubId = Number(data?.provider_id || data?.sub);
  if (!handle || !GITHUB_HANDLE.test(handle) || !Number.isSafeInteger(githubId) || githubId <= 0) return null;
  const avatar = isGithubAvatar(data?.avatar_url) ? data.avatar_url : null;
  return { handle, githubId, avatar };
}

/**
 * Creates or refreshes the developers row for a signed-in GitHub user, or
 * returns null when the auth user has no GitHub identity (e.g. an email
 * sign-up): only GitHub accounts become developers.
 */
export async function upsertDeveloper(userId: string) {
  const { data, error: userError } = await db().auth.admin.getUserById(userId);
  if (userError) throw userError;
  const identity = githubIdentity(data.user?.identities?.find((i) => i.provider === "github"));
  if (!identity) return null;
  const { data: row, error } = await db().rpc("upsert_developer", {
    p_id: userId,
    p_github_id: identity.githubId,
    p_handle: identity.handle,
    p_avatar_url: identity.avatar,
    p_is_admin: env.adminGithubIds.has(identity.githubId),
  });
  if (error) throw error;
  return row as NonNullable<Viewer["developer"]>;
}

/**
 * The signed-in developer for this request, or null. Uses getClaims(), which
 * verifies the JWT, so the identity can be trusted for writes.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // Session checks compare token expiry with the clock: keep them out of
  // prerenders (including cookie-aware prefetches) and run per request.
  await connection();
  const hasAuthCookie = (await cookies()).getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) return { developer: null };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || claims.is_anonymous) return { developer: null };

  const { data: row, error: rowError } = await db()
    .from("developers")
    .select("id, github_handle, avatar_url, is_admin")
    .eq("id", claims.sub)
    .maybeSingle();
  if (rowError) throw rowError;

  if (row) {
    return {
      developer: { id: row.id, handle: row.github_handle, avatar_url: row.avatar_url, is_admin: row.is_admin },
    };
  }
  // Session exists but the callback never created the row (e.g. it failed).
  const created = await upsertDeveloper(claims.sub);
  return { developer: created };
});
