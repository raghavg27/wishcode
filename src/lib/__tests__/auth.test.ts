import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAuthClient: vi.fn() }));
const rpc = vi.fn();
const getUserById = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ db: () => ({ rpc, auth: { admin: { getUserById } } }) }));

const { githubIdentity, upsertDeveloper } = await import("../auth");

const github = {
  provider: "github",
  identity_data: { user_name: "alice", provider_id: "1001", avatar_url: "https://avatars.githubusercontent.com/u/1001" },
};

describe("githubIdentity", () => {
  it("reads the handle, id and avatar GitHub gave Supabase Auth", () => {
    expect(githubIdentity(github)).toEqual({
      handle: "alice",
      githubId: 1001,
      avatar: "https://avatars.githubusercontent.com/u/1001",
    });
  });

  it("rejects other providers and malformed data", () => {
    expect(githubIdentity({ ...github, provider: "email" })).toBeNull();
    expect(githubIdentity(undefined)).toBeNull();
    expect(githubIdentity({ provider: "github", identity_data: { user_name: "alice" } })).toBeNull();
    expect(githubIdentity({ provider: "github", identity_data: { user_name: "-bad", provider_id: "1" } })).toBeNull();
  });
});

describe("upsertDeveloper", () => {
  afterEach(() => vi.clearAllMocks());

  it("ignores user_metadata, which the user can rewrite", async () => {
    getUserById.mockResolvedValue({
      data: {
        user: {
          user_metadata: { user_name: "admin", provider_id: "1" },
          identities: [github],
        },
      },
      error: null,
    });
    rpc.mockResolvedValue({ data: { id: "u1", handle: "alice" }, error: null });

    await upsertDeveloper("u1");

    expect(rpc).toHaveBeenCalledWith("upsert_developer", expect.objectContaining({ p_github_id: 1001, p_handle: "alice" }));
  });

  it("grants admin by GitHub id, never by handle", async () => {
    vi.stubEnv("ADMIN_GITHUB_IDS", "1001");
    rpc.mockResolvedValue({ data: {}, error: null });
    const signIn = (handle: string, id: string) =>
      getUserById.mockResolvedValue({
        data: { user: { identities: [{ provider: "github", identity_data: { user_name: handle, provider_id: id } }] } },
        error: null,
      });

    signIn("alice", "1001");
    await upsertDeveloper("u1");
    // Someone who registered the admin's old handle.
    signIn("alice", "2002");
    await upsertDeveloper("u3");

    expect(rpc.mock.calls.map(([, args]) => args.p_is_admin)).toEqual([true, false]);
    vi.unstubAllEnvs();
  });

  it("never makes a developer of an auth user with no GitHub identity", async () => {
    getUserById.mockResolvedValue({
      data: {
        user: {
          user_metadata: { user_name: "alice", provider_id: "1001" },
          identities: [{ provider: "email", identity_data: { user_name: "alice", provider_id: "1001" } }],
        },
      },
      error: null,
    });

    expect(await upsertDeveloper("u2")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
