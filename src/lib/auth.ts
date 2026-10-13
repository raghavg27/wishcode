import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

type GithubMetadata = {
  user_name?: string;
  preferred_username?: string;
  avatar_url?: string;
  provider_id?: string;
  sub?: string;
};

const HANDLE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;

/** Extracts the GitHub identity Supabase stores in user_metadata. */
export function githubIdentity(meta: GithubMetadata | undefined) {
  const handle = meta?.user_name || meta?.preferred_username;
  const githubId = Number(meta?.provider_id || meta?.sub);
  if (!handle || !HANDLE.test(handle) || !Number.isSafeInteger(githubId) || githubId <= 0) return null;
  const avatar = meta?.avatar_url?.startsWith("https://") ? meta.avatar_url : null;
  return { handle, githubId, avatar };
}

/** Creates or refreshes the developers row for a signed-in GitHub user. */
export async function upsertDeveloper(userId: string, meta: GithubMetadata | undefined) {
  const identity = githubIdentity(meta);
  if (!identity) return null;
  const { data, error } = await db().rpc("upsert_developer", {
    p_id: userId,
    p_github_id: identity.githubId,
    p_handle: identity.handle,
    p_avatar_url: identity.avatar,
    p_is_admin: env.adminHandles.has(identity.handle.toLowerCase()),
  });
  if (error) throw error;
  return data as NonNullable<Viewer["developer"]>;
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
  const created = await upsertDeveloper(claims.sub, claims.user_metadata as GithubMetadata);
  return { developer: created };
});
