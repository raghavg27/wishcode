-- Trust and the loop (docs/superpowers/specs/2026-10-13-trust-and-loop-design.md)
--
-- 1. Verdicts: the wisher, or people who me-too'd a wish, vote on whether each
--    link works. A trigger keeps links.verdict (unverified / verified /
--    flagged) and its counts current.
-- 2. Wish status is derived from live links (non-deleted, not flagged), so a
--    wish whose only link is flagged drops back to Being built or Open.
--    wishes.verified is true while at least one link is verified.
-- 3. Email subscriptions: the wisher and me-too-ers can ask to be emailed
--    when someone posts a link. Addresses never leave the database except
--    through link_notification, which only the mailer calls.
--
-- Lock order on every write path is link -> wish, so verdicts, link posts
-- and me-too removals never deadlock each other.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

create type public.link_verdict as enum ('unverified', 'verified', 'flagged');

-- Maintained by private.refresh_link_verdict; never written directly.
alter table public.links
  add column verdict         public.link_verdict not null default 'unverified',
  add column works_count     integer not null default 0 check (works_count >= 0),
  add column broken_count    integer not null default 0 check (broken_count >= 0),
  add column wisher_verdict  boolean;

-- Maintained by private.refresh_wish_links; never written directly.
alter table public.wishes
  add column live_link_count  integer not null default 0 check (live_link_count >= 0),
  add column verified         boolean not null default false;

-- No link can be flagged yet, so every counted link is live.
update public.wishes set live_link_count = link_count where link_count > 0;

-- One verdict per device per link: works (true) or doesn't work (false).
create table public.verdicts (
  link_id     bigint not null references public.links (id),
  device_id   bigint not null references public.devices (id),
  works       boolean not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (link_id, device_id)
);
create index verdicts_device_idx on public.verdicts (device_id, link_id);

-- device_id is whose verdict a vote cast from an email counts as.
create table public.subscriptions (
  id               bigint generated always as identity primary key,
  wish_id          bigint not null references public.wishes (id),
  device_id        bigint not null references public.devices (id),
  email            text not null check (char_length(email) <= 254 and email = lower(btrim(email))),
  created_at       timestamptz not null default now(),
  unsubscribed_at  timestamptz,
  unique (wish_id, email)
);
create index subscriptions_device_idx on public.subscriptions (device_id, wish_id);

-- Addresses that turned off all Wishcode emails.
create table public.email_suppressions (
  email       text primary key,
  created_at  timestamptz not null default now()
);

alter table public.verdicts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.email_suppressions enable row level security;

-- ---------------------------------------------------------------------------
-- Derived state
-- ---------------------------------------------------------------------------

-- Recomputes a wish's link counters, status and fulfilled_at from its links.
create or replace function private.refresh_wish_links(p_wish_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_links     integer;
  v_live      integer;
  v_verified  boolean;
begin
  perform 1 from public.wishes where id = p_wish_id for update;

  select count(*),
         count(*) filter (where l.verdict <> 'flagged'),
         coalesce(bool_or(l.verdict = 'verified'), false)
  into v_links, v_live, v_verified
  from public.links l
  where l.wish_id = p_wish_id and l.deleted_at is null;

  update public.wishes w
  set link_count      = v_links,
      live_link_count = v_live,
      verified        = v_verified,
      status = case
        when v_live > 0 then 'fulfilled'::public.wish_status
        when w.claim_count > 0 then 'being_built'::public.wish_status
        else 'open'::public.wish_status
      end,
      fulfilled_at = case
        when v_live = 0 then null
        when w.live_link_count = 0 or w.fulfilled_at is null then now()
        else w.fulfilled_at
      end
  where w.id = p_wish_id;
end;
$$;

-- Me-too and claim counters keep their increment logic; status now follows
-- live links instead of all links.
create or replace function private.bump_wish(p_wish_id bigint, d_metoo integer, d_claim integer)
returns void
language sql
set search_path = ''
as $$
  update public.wishes w
  set metoo_count = w.metoo_count + d_metoo,
      claim_count = w.claim_count + d_claim,
      status = case
        when w.live_link_count > 0 then 'fulfilled'::public.wish_status
        when w.claim_count + d_claim > 0 then 'being_built'::public.wish_status
        else 'open'::public.wish_status
      end
  where w.id = p_wish_id;
$$;

create or replace function private.on_metoo_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.bump_wish(new.wish_id, 1, 0);
  else
    perform private.bump_wish(old.wish_id, -1, 0);
  end if;
  return null;
end;
$$;

create or replace function private.on_claim_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.bump_wish(new.wish_id, 0, 1);
  else
    perform private.bump_wish(old.wish_id, 0, -1);
  end if;
  return null;
end;
$$;

drop function private.bump_wish(bigint, integer, integer, integer);

create or replace function private.on_link_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.refresh_wish_links(new.wish_id);
  elsif tg_op = 'DELETE' then
    perform private.refresh_wish_links(old.wish_id);
  elsif old.deleted_at is distinct from new.deleted_at or old.verdict is distinct from new.verdict then
    perform private.refresh_wish_links(new.wish_id);
  end if;
  return null;
end;
$$;

drop trigger links_counter on public.links;
create trigger links_counter after insert or delete or update of deleted_at, verdict on public.links
  for each row execute function private.on_link_change();

-- Recomputes a link's verdict. The wisher's verdict overrides the crowd;
-- otherwise 3 votes decide, and a tie leans toward flagged.
create or replace function private.refresh_link_verdict(p_link_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_wisher_device  bigint;
  v_wisher         boolean;
  v_works          integer;
  v_broken         integer;
  v_verdict        public.link_verdict;
begin
  -- Serialises concurrent votes so each recount sees the others.
  select w.device_id into v_wisher_device
  from public.links l
  join public.wishes w on w.id = l.wish_id
  where l.id = p_link_id
  for update of l;
  if not found then
    return;
  end if;

  select works into v_wisher
  from public.verdicts where link_id = p_link_id and device_id = v_wisher_device;

  select count(*) filter (where works), count(*) filter (where not works)
  into v_works, v_broken
  from public.verdicts where link_id = p_link_id and device_id <> v_wisher_device;

  v_verdict := case
    when v_wisher then 'verified'
    when not v_wisher then 'flagged'
    when v_works >= 3 and v_works > v_broken then 'verified'
    when v_broken >= 3 and v_broken >= v_works then 'flagged'
    else 'unverified'
  end;

  update public.links
  set wisher_verdict = v_wisher, works_count = v_works, broken_count = v_broken, verdict = v_verdict
  where id = p_link_id
    and (wisher_verdict is distinct from v_wisher or works_count <> v_works
         or broken_count <> v_broken or verdict <> v_verdict);
end;
$$;

create or replace function private.on_verdict_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_link_verdict(old.link_id);
  else
    perform private.refresh_link_verdict(new.link_id);
  end if;
  return null;
end;
$$;

create trigger verdicts_refresh after insert or update or delete on public.verdicts
  for each row execute function private.on_verdict_change();

-- Removing a me-too takes back that device's votes on the wish's links and
-- ends its email subscription. The wisher stays eligible, so theirs stay.
-- Named to fire before metoos_counter (triggers run in name order), which
-- keeps the link -> wish lock order.
create or replace function private.on_metoo_removed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.wishes where id = old.wish_id and device_id = old.device_id) then
    return null;
  end if;

  delete from public.verdicts v
  using public.links l
  where v.link_id = l.id and l.wish_id = old.wish_id and v.device_id = old.device_id;

  update public.subscriptions
  set unsubscribed_at = now()
  where wish_id = old.wish_id and device_id = old.device_id and unsubscribed_at is null;

  return null;
end;
$$;

create trigger metoos_clear_verdicts after delete on public.metoos
  for each row execute function private.on_metoo_removed();

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- The wisher, or a device with an active me-too on the wish.
create or replace function private.is_eligible(p_wish_id bigint, p_device_id bigint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_device_id is not null and (
    exists (select 1 from public.wishes where id = p_wish_id and device_id = p_device_id)
    or exists (select 1 from public.metoos where wish_id = p_wish_id and device_id = p_device_id)
  );
$$;

-- Sets (true/false) or clears (null) a device's verdict on a link.
create or replace function private.apply_verdict(p_device_id bigint, p_link_id bigint, p_works boolean, p_wish_id bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_link     public.links;
  v_deleted  timestamptz;
begin
  select * into v_link from public.links where id = p_link_id for update;
  if not found or v_link.deleted_at is not null or (p_wish_id is not null and v_link.wish_id <> p_wish_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select deleted_at into v_deleted from public.wishes where id = v_link.wish_id;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;
  if not private.is_eligible(v_link.wish_id, p_device_id) then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;

  if p_works is null then
    delete from public.verdicts where link_id = p_link_id and device_id = p_device_id;
  else
    insert into public.verdicts as v (link_id, device_id, works)
    values (p_link_id, p_device_id, p_works)
    on conflict (link_id, device_id) do update
      set works = excluded.works, updated_at = now()
      where v.works is distinct from excluded.works;
  end if;

  return (
    select jsonb_build_object(
      'link_id', l.id,
      'wish_id', l.wish_id,
      'works', p_works,
      'verdict', l.verdict,
      'works_count', l.works_count,
      'broken_count', l.broken_count,
      'wisher_verdict', l.wisher_verdict,
      'developer_handle', d.github_handle,
      'wish_status', w.status,
      'wish_verified', w.verified)
    from public.links l
    join public.wishes w on w.id = l.wish_id
    join public.developers d on d.id = l.developer_id
    where l.id = p_link_id
  );
end;
$$;

-- Card-shaped JSON for a wish. first_link is the first live link: a flagged
-- link never stands for the wish on a card.
create or replace function private.wish_card(w public.wishes)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', w.id,
    'text', case when w.deleted_at is null then w.text else null end,
    'status', w.status,
    'verified', w.verified,
    'metoo_count', w.metoo_count,
    'claim_count', w.claim_count,
    'link_count', w.link_count,
    'live_link_count', w.live_link_count,
    'created_at', w.created_at,
    'fulfilled_at', w.fulfilled_at,
    'removed', w.deleted_at is not null,
    'first_link', (
      select jsonb_build_object(
        'id', l.id, 'url', l.url, 'created_at', l.created_at, 'verdict', l.verdict,
        'developer', private.developer_json(d.id, d.github_handle, d.avatar_url))
      from public.links l
      join public.developers d on d.id = l.developer_id
      where l.wish_id = w.id and l.deleted_at is null and l.verdict <> 'flagged'
      order by l.created_at, l.id
      limit 1
    ),
    'builders', coalesce((
      select jsonb_agg(private.developer_json(b.id, b.github_handle, b.avatar_url) order by b.claimed_at)
      from (
        select d.id, d.github_handle, d.avatar_url, c.created_at as claimed_at
        from public.claims c
        join public.developers d on d.id = c.developer_id
        where c.wish_id = w.id
        order by c.created_at
        limit 3
      ) b
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Write API (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.set_verdict(p_token_hash text, p_link_id bigint, p_works boolean)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_device bigint;
begin
  select id into v_device from public.devices where token_hash = p_token_hash;
  return private.apply_verdict(v_device, p_link_id, p_works, null);
end;
$$;

-- A vote from an email counts as the subscription's device.
create or replace function public.set_verdict_by_subscription(p_subscription_id bigint, p_link_id bigint, p_works boolean)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return private.apply_verdict(v_sub.device_id, p_link_id, p_works, v_sub.wish_id);
end;
$$;

create or replace function public.subscribe(
  p_token_hash   text,
  p_ip_key       text,
  p_wish_id      bigint,
  p_email        text,
  p_device_limit integer,
  p_ip_limit     integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_device   bigint;
  v_deleted  timestamptz;
  v_sub      public.subscriptions;
begin
  if char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  select deleted_at into v_deleted from public.wishes where id = p_wish_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;

  select id into v_device from public.devices where token_hash = p_token_hash;
  if not private.is_eligible(p_wish_id, v_device) then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.email_suppressions where email = v_email) then
    raise exception 'suppressed' using errcode = 'P0001';
  end if;

  select * into v_sub from public.subscriptions where wish_id = p_wish_id and email = v_email for update;
  if found and v_sub.unsubscribed_at is null and v_sub.device_id = v_device then
    return jsonb_build_object('subscribed', true);
  end if;

  perform private.consume_rate_limit('device:subscribe:' || v_device, p_device_limit, interval '1 day');
  if p_ip_key is not null then
    perform private.consume_rate_limit('ip:subscribe:' || p_ip_key, p_ip_limit, interval '1 day');
  end if;

  -- Re-subscribing (or subscribing from another browser) moves the
  -- subscription to this device.
  insert into public.subscriptions as s (wish_id, device_id, email)
  values (p_wish_id, v_device, v_email)
  on conflict (wish_id, email) do update
    set device_id = excluded.device_id, unsubscribed_at = null;

  return jsonb_build_object('subscribed', true);
end;
$$;

create or replace function public.unsubscribe(p_subscription_id bigint, p_all boolean)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_sub public.subscriptions;
begin
  update public.subscriptions
  set unsubscribed_at = coalesce(unsubscribed_at, now())
  where id = p_subscription_id
  returning * into v_sub;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_all then
    insert into public.email_suppressions (email) values (v_sub.email) on conflict do nothing;
  end if;

  return jsonb_build_object('wish_id', v_sub.wish_id, 'all', coalesce(p_all, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- Read API (service_role only)
-- ---------------------------------------------------------------------------

-- Everything the mailer needs for one new link. The only function that
-- returns email addresses. Deleted wishes or links have no recipients.
create or replace function public.link_notification(p_link_id bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'wish_id', w.id,
    'wish_text', w.text,
    'link_id', l.id,
    'link_url', l.url,
    'description', l.description,
    'handle', d.github_handle,
    'recipients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'subscription_id', s.id, 'email', s.email, 'is_wisher', s.device_id = w.device_id)
        order by s.id)
      from public.subscriptions s
      where s.wish_id = w.id
        and s.unsubscribed_at is null
        and l.deleted_at is null
        and w.deleted_at is null
        and not exists (select 1 from public.email_suppressions e where e.email = s.email)
    ), '[]'::jsonb))
  from public.links l
  join public.wishes w on w.id = l.wish_id
  join public.developers d on d.id = l.developer_id
  where l.id = p_link_id;
$$;

-- Viewer-specific state for a wish page. Never cached by the app; never
-- returns an email address.
create or replace function public.viewer_wish_state(p_token_hash text, p_wish_id bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with dev as (
    select id from public.devices where token_hash = p_token_hash
  )
  select jsonb_build_object(
    'is_wisher', exists (select 1 from public.wishes w, dev where w.id = p_wish_id and w.device_id = dev.id),
    'has_metoo', exists (select 1 from public.metoos m, dev where m.wish_id = p_wish_id and m.device_id = dev.id),
    'subscribed', exists (
      select 1 from public.subscriptions s, dev
      where s.wish_id = p_wish_id and s.device_id = dev.id and s.unsubscribed_at is null),
    'verdicts', coalesce((
      select jsonb_object_agg(v.link_id::text, v.works)
      from public.verdicts v
      join public.links l on l.id = v.link_id
      join dev on dev.id = v.device_id
      where l.wish_id = p_wish_id and l.deleted_at is null
    ), '{}'::jsonb));
$$;

-- Links now carry their verdict. Flagged links sort after the others.
create or replace function public.get_wish(p_id bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.wish_card(w) || jsonb_build_object(
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'url', l.url, 'description', l.description, 'repo_url', l.repo_url,
        'created_at', l.created_at, 'verdict', l.verdict, 'works_count', l.works_count,
        'broken_count', l.broken_count, 'wisher_verdict', l.wisher_verdict,
        'developer', private.developer_json(d.id, d.github_handle, d.avatar_url))
        order by l.verdict = 'flagged', l.created_at, l.id)
      from public.links l
      join public.developers d on d.id = l.developer_id
      where l.wish_id = w.id and l.deleted_at is null and w.deleted_at is null
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'created_at', c.created_at, 'developer', private.developer_json(d.id, d.github_handle, d.avatar_url))
        order by c.created_at)
      from public.claims c
      join public.developers d on d.id = c.developer_id
      where c.wish_id = w.id and w.deleted_at is null
    ), '[]'::jsonb)
  )
  from public.wishes w
  where w.id = p_id;
$$;

-- First to ship now means the first live (non-flagged) link.
create or replace function public.developer_profile(p_handle text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with dev as (
    select * from public.developers where lower(github_handle) = lower(p_handle)
  ),
  dev_links as (
    select l.*,
           l.id = (select f.id from public.links f
                   where f.wish_id = l.wish_id and f.deleted_at is null and f.verdict <> 'flagged'
                   order by f.created_at, f.id limit 1) as first_to_ship
    from public.links l
    join dev on dev.id = l.developer_id
    join public.wishes w on w.id = l.wish_id and w.deleted_at is null
    where l.deleted_at is null
  ),
  dev_claims as (
    select c.*
    from public.claims c
    join dev on dev.id = c.developer_id
    join public.wishes w on w.id = c.wish_id and w.deleted_at is null
    where not exists (select 1 from dev_links dl where dl.wish_id = c.wish_id)
  )
  select private.developer_json(dev.id, dev.github_handle, dev.avatar_url) || jsonb_build_object(
    'joined_at', dev.created_at,
    'stats', jsonb_build_object(
      'links', (select count(*) from dev_links),
      'first_to_ship', (select count(*) from dev_links where first_to_ship),
      'building', (select count(*) from dev_claims)),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dl.id, 'url', dl.url, 'description', dl.description, 'repo_url', dl.repo_url,
        'created_at', dl.created_at, 'first_to_ship', dl.first_to_ship, 'verdict', dl.verdict,
        'wish', private.wish_card(w)) order by dl.created_at desc)
      from dev_links dl join public.wishes w on w.id = dl.wish_id
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'created_at', dc.created_at, 'wish', private.wish_card(w)) order by dc.created_at desc)
      from dev_claims dc join public.wishes w on w.id = dc.wish_id
    ), '[]'::jsonb)
  )
  from dev;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.verdicts, public.subscriptions, public.email_suppressions from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant all on public.verdicts, public.subscriptions, public.email_suppressions to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on all functions in schema private to service_role;
