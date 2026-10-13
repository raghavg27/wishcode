-- 1. A new wish starts with zero me-toos. The wisher no longer gets an
--    automatic me-too on their own wish.
-- 2. Pages read me-too counts live (one primary-key lookup per page) instead
--    of from the cached feed, so counts never lag.
-- 3. page_exists lets the proxy answer unknown wish and developer URLs with a
--    real 404 before the page starts streaming.

create or replace function public.create_wish(
  p_token_hash   text,
  p_ip_key       text,
  p_text         text,
  p_embedding    extensions.vector,
  p_device_limit integer,
  p_ip_limit     integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_device bigint;
  v_id     bigint;
begin
  if p_text is null or char_length(p_text) not between 20 and 200 then
    raise exception 'invalid_text' using errcode = 'P0001';
  end if;

  v_device := private.ensure_device(p_token_hash);

  -- Idempotency: a double-submit of the same text from the same device
  -- returns the wish that was already created instead of a duplicate.
  select id into v_id
  from public.wishes
  where device_id = v_device
    and lower(text) = lower(p_text)
    and created_at > now() - interval '10 minutes'
    and deleted_at is null
  order by created_at desc
  limit 1;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'existing', true);
  end if;

  perform private.consume_rate_limit('device:wish:' || v_device, p_device_limit, interval '1 day');
  if p_ip_key is not null then
    perform private.consume_rate_limit('ip:wish:' || p_ip_key, p_ip_limit, interval '1 day');
  end if;

  insert into public.wishes (text, embedding, device_id)
  values (p_text, p_embedding, v_device)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'existing', false);
end;
$$;

-- Backfill: remove the automatic me-toos added by the old create_wish. They
-- were inserted in the same transaction as the wish, so they share its exact
-- created_at; a me-too the wisher tapped later does not. The counter trigger
-- decrements metoo_count.
delete from public.metoos m
using public.wishes w
where m.wish_id = w.id
  and m.device_id = w.device_id
  and m.created_at = w.created_at;

-- Live me-too counts for a page of wishes, plus which of them this device has
-- me-too'd. Replaces viewer_metoos. Never cached by the app.
create or replace function public.live_metoos(p_token_hash text, p_wish_ids bigint[])
returns table (wish_id bigint, metoo_count integer, mine boolean)
language sql
stable
set search_path = ''
as $$
  with dev as (
    select id from public.devices where token_hash = p_token_hash
  )
  select w.id,
         w.metoo_count,
         exists (select 1 from public.metoos m, dev where m.wish_id = w.id and m.device_id = dev.id)
  from public.wishes w
  where w.id = any (p_wish_ids[1:100]);
$$;

drop function if exists public.viewer_metoos(text, bigint[]);

-- Removed wishes still exist: their page shows the "removed" state.
create or replace function public.page_exists(p_wish_id bigint, p_handle text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_wish_id is not null then exists (select 1 from public.wishes where id = p_wish_id)
    else exists (select 1 from public.developers where lower(github_handle) = lower(p_handle))
  end;
$$;

revoke all on function public.page_exists(bigint, text) from public, anon, authenticated;
grant execute on function public.page_exists(bigint, text) to service_role;
revoke all on function public.live_metoos(text, bigint[]) from public, anon, authenticated;
grant execute on function public.live_metoos(text, bigint[]) to service_role;
revoke all on function public.create_wish(text, text, text, extensions.vector, integer, integer) from public, anon, authenticated;
grant execute on function public.create_wish(text, text, text, extensions.vector, integer, integer) to service_role;
