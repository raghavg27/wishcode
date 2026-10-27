-- Related wishes on each wish page, and developer activity dates for the
-- sitemap.
--
-- related_wishes ranks the wish's nearest neighbours by embedding first, then
-- trigram matches (for wishes not embedded yet), then the most-wanted wishes,
-- so every wish page links to a few others and crawlers can reach the whole
-- archive from any wish.

create or replace function public.related_wishes(p_id bigint, p_limit integer)
returns jsonb
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 10);
  v_wish  public.wishes;
begin
  select * into v_wish from public.wishes where id = p_id and deleted_at is null;
  if not found then
    return '[]'::jsonb;
  end if;

  perform set_config('pg_trgm.similarity_threshold', '0.3', true);

  return (
    select coalesce(jsonb_agg(private.wish_card(r.w) order by r.rank, r.score desc), '[]'::jsonb)
    from (
      -- A wish found more than one way keeps its best rank.
      select d.w, d.rank, d.score
      from (
        select distinct on ((m.w).id) m.w, m.rank, m.score
        from (
          select n.w, 0 as rank, n.score
          from (
            select w, (1 - (w.embedding <=> v_wish.embedding))::double precision as score
            from public.wishes w
            where v_wish.embedding is not null
              and w.deleted_at is null and w.embedding is not null and w.id <> p_id
            order by w.embedding <=> v_wish.embedding
            limit v_limit
          ) n
          union all
          select t.w, 1 as rank, t.score
          from (
            select w, similarity(w.text, v_wish.text)::double precision as score
            from public.wishes w
            where w.deleted_at is null and w.id <> p_id and w.text % v_wish.text
            order by similarity(w.text, v_wish.text) desc
            limit v_limit
          ) t
          union all
          select p.w, 2 as rank, p.score
          from (
            select w, w.metoo_count::double precision as score
            from public.wishes w
            where w.deleted_at is null and w.id <> p_id
            order by w.metoo_count desc, w.id desc
            limit v_limit
          ) p
        ) m
        order by (m.w).id, m.rank, m.score desc
      ) d
      order by d.rank, d.score desc
      limit v_limit
    ) r
  );
end;
$$;

-- Developers now carry the time of their newest live link (or their join
-- date) so the sitemap can say when a profile last changed.
create or replace function public.sitemap_entries()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'wishes', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'updated_at', t.updated_at))
      from (
        select id, coalesce(fulfilled_at, created_at) as updated_at
        from public.wishes where deleted_at is null
        order by created_at desc limit 45000
      ) t), '[]'::jsonb),
    'developers', coalesce((
      select jsonb_agg(jsonb_build_object('handle', d.github_handle, 'updated_at', d.updated_at))
      from (
        select dev.github_handle,
               coalesce((select max(l.created_at) from public.links l
                         where l.developer_id = dev.id and l.deleted_at is null), dev.created_at) as updated_at
        from public.developers dev
        where dev.github_handle !~ '~' order by dev.created_at desc limit 4000
      ) d), '[]'::jsonb)
  );
$$;

revoke all on function public.related_wishes(bigint, integer) from public, anon, authenticated;
grant execute on function public.related_wishes(bigint, integer) to service_role;
