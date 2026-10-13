-- Duplicate suggestions switch to Supabase's built-in gte-small model
-- (supabase/functions/embed), which outputs 384 dimensions instead of 1536.
--
-- Existing 1536-dim embeddings can't be converted, so they are cleared. Run
-- the embed function's backfill afterwards to embed every wish again (see
-- README). similar_wishes now also trigram-matches wishes that have no
-- embedding yet, so a wish posted while the function was cold or down is
-- never invisible to duplicate checks.
--
-- Function parameters (create_wish, similar_wishes) are declared as
-- extensions.vector; Postgres ignores dimension modifiers on parameters, so
-- they accept 384-dim vectors unchanged.

drop index if exists public.wishes_embedding_idx;

update public.wishes set embedding = null where embedding is not null;

alter table public.wishes alter column embedding type extensions.vector(384);

create index wishes_embedding_idx on public.wishes
  using hnsw (embedding extensions.vector_cosine_ops)
  where deleted_at is null;

create or replace function public.similar_wishes(
  p_embedding  extensions.vector,
  p_text       text,
  p_threshold  double precision,
  p_limit      integer
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 3), 1), 10);
begin
  perform set_config('pg_trgm.similarity_threshold', '0.45', true);

  -- Without an embedding: trigram match against every wish.
  if p_embedding is null then
    return (
      select coalesce(jsonb_agg(private.wish_card(c.w) || jsonb_build_object('similarity', round(c.sim::numeric, 3))
                                order by c.sim desc), '[]'::jsonb)
      from (
        select w, similarity(w.text, p_text) as sim
        from public.wishes w
        where w.deleted_at is null and w.text % p_text
        order by similarity(w.text, p_text) desc
        limit v_limit
      ) c
    );
  end if;

  -- With an embedding: nearest neighbours above the threshold, then trigram
  -- matches among wishes not embedded yet. Vector matches rank first.
  return (
    select coalesce(jsonb_agg(private.wish_card(c.w) || jsonb_build_object('similarity', round(c.sim::numeric, 3))
                              order by c.rank, c.sim desc), '[]'::jsonb)
    from (
      select m.w, m.sim, m.rank
      from (
        select n.w, n.sim, 0 as rank
        from (
          select w, 1 - (w.embedding <=> p_embedding) as sim
          from public.wishes w
          where w.deleted_at is null and w.embedding is not null
          order by w.embedding <=> p_embedding
          limit 20
        ) n
        where n.sim >= p_threshold
        union all
        select t.w, t.sim, 1 as rank
        from (
          select w, similarity(w.text, p_text) as sim
          from public.wishes w
          where w.deleted_at is null and w.embedding is null and w.text % p_text
          order by similarity(w.text, p_text) desc
          limit v_limit
        ) t
      ) m
      order by m.rank, m.sim desc
      limit v_limit
    ) c
  );
end;
$$;

revoke all on function public.similar_wishes(extensions.vector, text, double precision, integer) from public, anon, authenticated;
grant execute on function public.similar_wishes(extensions.vector, text, double precision, integer) to service_role;
