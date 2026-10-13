// Wish embeddings with Supabase's built-in gte-small model (384 dims). There
// is no model fee: it runs inside the Edge Runtime and only uses the
// function's normal CPU time.
//
// Only the Next.js server calls this, with a project secret key in the
// `apikey` header. Deploy with JWT verification off (the key is checked here):
//   supabase functions deploy embed --no-verify-jwt
//
// POST { "input": "wish text" }       → { "embedding": number[384] }
// POST { "backfill": true, "limit"? } → embeds wishes that have no embedding
//                                       yet; → { "embedded": n, "remaining": bool }

import { withSupabase } from "npm:@supabase/server@1.8.1";

declare const Supabase: {
  ai: { Session: new (model: "gte-small") => { run(input: string, options: { mean_pool: boolean; normalize: boolean }): Promise<number[]> } };
};

const model = new Supabase.ai.Session("gte-small");
const MAX_INPUT = 1000;
const MAX_BACKFILL = 50;

const embed = (text: string) => model.run(text, { mean_pool: true, normalize: true });

export default {
  // 'secret:*' accepts any of the project's secret keys: the key in Vercel
  // need not be the one named "default".
  fetch: withSupabase({ auth: "secret:*" }, async (req, ctx) => {
    if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });

    let body: { input?: unknown; backfill?: unknown; limit?: unknown };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    if (body.backfill === true) {
      const limit = Math.min(Math.max(Number(body.limit) || 20, 1), MAX_BACKFILL);
      const { data: wishes, error } = await ctx.supabaseAdmin
        .from("wishes")
        .select("id, text")
        .is("embedding", null)
        .is("deleted_at", null)
        .order("id")
        .limit(limit);
      if (error) return Response.json({ error: error.message }, { status: 500 });

      for (const wish of wishes ?? []) {
        const embedding = await embed(wish.text);
        const { error: updateError } = await ctx.supabaseAdmin
          .from("wishes")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", wish.id);
        if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
      }
      return Response.json({ embedded: wishes?.length ?? 0, remaining: (wishes?.length ?? 0) === limit });
    }

    const input = typeof body.input === "string" ? body.input.trim() : "";
    if (!input || input.length > MAX_INPUT) return Response.json({ error: "invalid_input" }, { status: 400 });
    return Response.json({ embedding: await embed(input) });
  }),
};
