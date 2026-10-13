-- Wishcode v1 schema.
--
-- Security model
--   * Every table has RLS enabled and NO policies, and anon/authenticated have
--     no table or function privileges. The browser never talks to the
--     database directly; the publishable key is only used for Supabase Auth.
--   * All reads and writes go through the functions below, which only the
--     service_role may execute. The Next.js server calls them after it has
--     verified the device cookie or the developer session.
--   * Denormalised counters (metoo_count, claim_count, link_count) and the
--     wish status are maintained by triggers using row-locked increments, so
--     they stay correct under concurrent writes and for any write path.

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.wish_status as enum ('open', 'being_built', 'fulfilled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.devices (
  id          bigint generated always as identity primary key,
  token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now()
);

-- One row per GitHub-connected developer. `id` is the Supabase auth user id.
-- Deliberately no FK to auth.users: links and claims must survive the auth
-- user being removed (PRD 3.5).
create table public.developers (
  id             uuid primary key,
  github_id      bigint not null unique,
  github_handle  text not null check (github_handle ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}(~[0-9]+)?$'),
  avatar_url     text check (avatar_url is null or avatar_url ~ '^https://'),
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index developers_handle_lower_idx on public.developers (lower(github_handle));

create table public.wishes (
  id            bigint generated always as identity primary key,
  text          text not null check (char_length(text) between 20 and 200),
  embedding     extensions.vector(1536),
  status        public.wish_status not null default 'open',
  device_id     bigint not null references public.devices (id),
  metoo_count   integer not null default 0 check (metoo_count >= 0),
  claim_count   integer not null default 0 check (claim_count >= 0),
  link_count    integer not null default 0 check (link_count >= 0),
  created_at    timestamptz not null default now(),
  fulfilled_at  timestamptz,
  deleted_at    timestamptz,
  deleted_by    uuid references public.developers (id) on update cascade
);

-- Ledger feed: newest / most me-toos, optionally filtered by status.
create index wishes_newest_idx on public.wishes (created_at desc, id desc) where deleted_at is null;
create index wishes_status_newest_idx on public.wishes (status, created_at desc, id desc) where deleted_at is null;
create index wishes_top_idx on public.wishes (metoo_count desc, id desc) where deleted_at is null;
create index wishes_status_top_idx on public.wishes (status, metoo_count desc, id desc) where deleted_at is null;
create index wishes_device_created_idx on public.wishes (device_id, created_at desc);
-- Duplicate suggestions.
create index wishes_embedding_idx on public.wishes using hnsw (embedding extensions.vector_cosine_ops) where deleted_at is null;
create index wishes_text_trgm_idx on public.wishes using gin (text extensions.gin_trgm_ops) where deleted_at is null;

create table public.metoos (
  wish_id     bigint not null references public.wishes (id),
  device_id   bigint not null references public.devices (id),
  created_at  timestamptz not null default now(),
  primary key (wish_id, device_id)
);
create index metoos_device_idx on public.metoos (device_id, wish_id);
create index metoos_created_idx on public.metoos (created_at);

create table public.claims (
  wish_id       bigint not null references public.wishes (id),
  developer_id  uuid not null references public.developers (id) on update cascade,
  created_at    timestamptz not null default now(),
  primary key (wish_id, developer_id)
);
create index claims_developer_idx on public.claims (developer_id, created_at desc);

create table public.links (
  id            bigint generated always as identity primary key,
  wish_id       bigint not null references public.wishes (id),
  developer_id  uuid not null references public.developers (id) on update cascade,
  url           text not null check (char_length(url) <= 2048 and url ~ '^https://[^\s/?#]+'),
  description   text not null check (char_length(description) between 1 and 140),
  repo_url      text check (repo_url is null or (char_length(repo_url) <= 2048 and repo_url ~ '^https://[^\s/?#]+')),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references public.developers (id) on update cascade
);
create unique index links_one_per_developer_idx on public.links (wish_id, developer_id) where deleted_at is null;
create index links_wish_idx on public.links (wish_id, created_at, id) where deleted_at is null;
create index links_developer_idx on public.links (developer_id, created_at desc);
create index links_created_idx on public.links (created_at) where deleted_at is null;

-- Fixed-window counters for rate limiting (per device, per developer, per
-- hashed IP). Rows expire and are swept opportunistically.
create table private.rate_limits (
  key         text primary key,
  count       integer not null,
  expires_at  timestamptz not null
);
create index rate_limits_expires_idx on private.rate_limits (expires_at);

alter table public.devices enable row level security;
alter table public.developers enable row level security;
alter table public.wishes enable row level security;
alter table public.metoos enable row level security;
alter table public.claims enable row level security;
alter table public.links enable row level security;

-- ---------------------------------------------------------------------------
-- Counter + status triggers
-- ---------------------------------------------------------------------------

create or replace function private.bump_wish(p_wish_id bigint, d_metoo integer, d_claim integer, d_link integer)
returns void
language sql
set search_path = ''
as $$
  update public.wishes w
  set metoo_count = w.metoo_count + d_metoo,
      claim_count = w.claim_count + d_claim,
      link_count  = w.link_count + d_link,
      status = case
        when w.link_count + d_link > 0 then 'fulfilled'::public.wish_status
        when w.claim_count + d_claim > 0 then 'being_built'::public.wish_status
        else 'open'::public.wish_status
      end,
      fulfilled_at = case
        when w.link_count + d_link <= 0 then null
        when w.link_count <= 0 then now()
        else w.fulfilled_at
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
    perform private.bump_wish(new.wish_id, 1, 0, 0);
  else
    perform private.bump_wish(old.wish_id, -1, 0, 0);
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
    perform private.bump_wish(new.wish_id, 0, 1, 0);
  else
    perform private.bump_wish(old.wish_id, 0, -1, 0);
  end if;
  return null;
end;
$$;

create or replace function private.on_link_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      perform private.bump_wish(new.wish_id, 0, 0, 1);
    end if;
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      perform private.bump_wish(old.wish_id, 0, 0, -1);
    end if;
  elsif old.deleted_at is null and new.deleted_at is not null then
    perform private.bump_wish(new.wish_id, 0, 0, -1);
  elsif old.deleted_at is not null and new.deleted_at is null then
    perform private.bump_wish(new.wish_id, 0, 0, 1);
  end if;
  return null;
end;
$$;

create trigger metoos_counter after insert or delete on public.metoos
  for each row execute function private.on_metoo_change();
create trigger claims_counter after insert or delete on public.claims
  for each row execute function private.on_claim_change();
create trigger links_counter after insert or delete or update of deleted_at on public.links
  for each row execute function private.on_link_change();

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- Errors raised to the app use SQLSTATE P0001 with a stable machine-readable
-- message; `detail` carries extra context (e.g. the rate-limit reset time).

create or replace function private.consume_rate_limit(p_key text, p_limit integer, p_window interval)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_start  timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00');
  v_reset  timestamptz := v_start + p_window;
  v_count  integer;
begin
  if p_limit is null or p_limit <= 0 then
    return;
  end if;

  insert into private.rate_limits as r (key, count, expires_at)
  values (p_key || '@' || extract(epoch from v_start)::bigint, 1, v_reset)
  on conflict (key) do update set count = r.count + 1
  returning r.count into v_count;

  if v_count > p_limit then
    raise exception 'rate_limited'
      using errcode = 'P0001',
            detail = split_part(p_key, ':', 1) || '|' || to_char(v_reset at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  if random() < 0.01 then
    delete from private.rate_limits where expires_at < now() - interval '1 hour';
  end if;
end;
$$;

create or replace function private.ensure_device(p_token_hash text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  select id into v_id from public.devices where token_hash = p_token_hash;
  if v_id is null then
    insert into public.devices (token_hash) values (p_token_hash)
    on conflict (token_hash) do update set token_hash = excluded.token_hash
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function private.developer_json(p_id uuid, p_handle text, p_avatar_url text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('id', p_id, 'handle', p_handle, 'avatar_url', p_avatar_url);
$$;

-- Card-shaped JSON for a wish, shared by the feed, similarity results and
-- profiles. Removed wishes never expose their text.
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
    'metoo_count', w.metoo_count,
    'claim_count', w.claim_count,
    'link_count', w.link_count,
    'created_at', w.created_at,
    'fulfilled_at', w.fulfilled_at,
    'removed', w.deleted_at is not null,
    'first_link', (
      select jsonb_build_object(
        'id', l.id, 'url', l.url, 'created_at', l.created_at,
        'developer', private.developer_json(d.id, d.github_handle, d.avatar_url))
      from public.links l
      join public.developers d on d.id = l.developer_id
      where l.wish_id = w.id and l.deleted_at is null
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

create or replace function public.create_wish(
  p_token_hash   text,
  p_ip_key       text,
  p_text         text,
  p_embedding    extensions.vector(1536),
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

  -- The wisher's own wish starts with their me-too.
  insert into public.metoos (wish_id, device_id) values (v_id, v_device);

  return jsonb_build_object('id', v_id, 'existing', false);
end;
$$;

create or replace function public.set_metoo(
  p_token_hash   text,
  p_ip_key       text,
  p_wish_id      bigint,
  p_active       boolean,
  p_device_limit integer,
  p_ip_limit     integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_device  bigint;
  v_deleted timestamptz;
  v_count   integer;
  v_rows    integer;
begin
  select deleted_at into v_deleted from public.wishes where id = p_wish_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;

  v_device := private.ensure_device(p_token_hash);

  if p_active then
    insert into public.metoos (wish_id, device_id) values (p_wish_id, v_device)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      perform private.consume_rate_limit('device:metoo:' || v_device, p_device_limit, interval '1 day');
      if p_ip_key is not null then
        perform private.consume_rate_limit('ip:metoo:' || p_ip_key, p_ip_limit, interval '1 day');
      end if;
    end if;
  else
    delete from public.metoos where wish_id = p_wish_id and device_id = v_device;
  end if;

  select metoo_count into v_count from public.wishes where id = p_wish_id;
  return jsonb_build_object('active', p_active, 'metoo_count', v_count);
end;
$$;

create or replace function public.upsert_developer(
  p_id         uuid,
  p_github_id  bigint,
  p_handle     text,
  p_avatar_url text,
  p_is_admin   boolean
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_dev public.developers;
begin
  -- GitHub handles can be renamed and later re-registered by someone else.
  -- If another account still holds this handle, park it under a suffixed
  -- handle; it is corrected the next time that account signs in.
  update public.developers
  set github_handle = github_handle || '~' || github_id, updated_at = now()
  where lower(github_handle) = lower(p_handle) and github_id <> p_github_id;

  insert into public.developers as d (id, github_id, github_handle, avatar_url, is_admin)
  values (p_id, p_github_id, p_handle, p_avatar_url, p_is_admin)
  on conflict (github_id) do update
    set id            = excluded.id,
        github_handle = excluded.github_handle,
        avatar_url    = excluded.avatar_url,
        is_admin      = excluded.is_admin,
        updated_at    = now()
  returning * into v_dev;

  return private.developer_json(v_dev.id, v_dev.github_handle, v_dev.avatar_url) || jsonb_build_object('is_admin', v_dev.is_admin);
end;
$$;

create or replace function public.set_claim(
  p_developer_id uuid,
  p_wish_id      bigint,
  p_active       boolean,
  p_limit        integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_deleted timestamptz;
  v_rows    integer;
begin
  select deleted_at into v_deleted from public.wishes where id = p_wish_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;

  if p_active then
    insert into public.claims (wish_id, developer_id) values (p_wish_id, p_developer_id)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      perform private.consume_rate_limit('developer:claim:' || p_developer_id, p_limit, interval '1 day');
    end if;
  else
    delete from public.claims where wish_id = p_wish_id and developer_id = p_developer_id;
  end if;

  return (select jsonb_build_object('status', status, 'claim_count', claim_count)
          from public.wishes where id = p_wish_id);
end;
$$;

create or replace function public.create_link(
  p_developer_id uuid,
  p_wish_id      bigint,
  p_url          text,
  p_description  text,
  p_repo_url     text,
  p_limit        integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_deleted timestamptz;
  v_id      bigint;
begin
  -- Lock the wish so concurrent "first link" posts serialise cleanly.
  select deleted_at into v_deleted from public.wishes where id = p_wish_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.links
             where wish_id = p_wish_id and developer_id = p_developer_id and deleted_at is null) then
    raise exception 'already_linked' using errcode = 'P0001';
  end if;

  perform private.consume_rate_limit('developer:link:' || p_developer_id, p_limit, interval '1 day');

  insert into public.links (wish_id, developer_id, url, description, repo_url)
  values (p_wish_id, p_developer_id, p_url, p_description, nullif(p_repo_url, ''))
  returning id into v_id;

  return (select jsonb_build_object('id', v_id, 'status', status, 'link_count', link_count)
          from public.wishes where id = p_wish_id);
end;
$$;

create or replace function public.remove_link(p_developer_id uuid, p_link_id bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_link     public.links;
  v_is_admin boolean;
begin
  select * into v_link from public.links where id = p_link_id and deleted_at is null;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select is_admin into v_is_admin from public.developers where id = p_developer_id;
  if v_link.developer_id <> p_developer_id and not coalesce(v_is_admin, false) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  update public.links set deleted_at = now(), deleted_by = p_developer_id where id = p_link_id;

  return (select jsonb_build_object('wish_id', id, 'status', status, 'link_count', link_count)
          from public.wishes where id = v_link.wish_id);
end;
$$;

create or replace function public.admin_delete_wish(p_developer_id uuid, p_wish_id bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.developers where id = p_developer_id and is_admin) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  update public.wishes set deleted_at = now(), deleted_by = p_developer_id
  where id = p_wish_id and deleted_at is null;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  return jsonb_build_object('id', p_wish_id, 'removed', true);
end;
$$;

-- Generic limiter for app-level checks (e.g. embedding calls per IP).
-- Returns false instead of raising so callers can degrade gracefully.
create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform private.consume_rate_limit('app:' || p_key, p_limit, make_interval(secs => p_window_seconds));
  return true;
exception when sqlstate 'P0001' then
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read API (service_role only; results are cached by the app)
-- ---------------------------------------------------------------------------

create or replace function public.ledger_feed(
  p_status       public.wish_status,
  p_sort         text,
  p_after_ts     timestamptz,
  p_after_count  integer,
  p_after_id     bigint,
  p_limit        integer
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with page as (
    select w as wr, w.id, w.created_at, w.metoo_count
    from public.wishes w
    where w.deleted_at is null
      and (p_status is null or w.status = p_status)
      and (
        p_after_id is null
        or (p_sort = 'top' and (w.metoo_count, w.id) < (p_after_count, p_after_id))
        or (p_sort <> 'top' and (w.created_at, w.id) < (p_after_ts, p_after_id))
      )
    order by
      case when p_sort = 'top' then w.metoo_count end desc nulls last,
      case when p_sort <> 'top' then w.created_at end desc nulls last,
      w.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select coalesce(jsonb_agg(private.wish_card(page.wr) order by
      case when p_sort = 'top' then page.metoo_count end desc nulls last,
      case when p_sort <> 'top' then page.created_at end desc nulls last,
      page.id desc), '[]'::jsonb)
  from page;
$$;

create or replace function public.similar_wishes(
  p_embedding  extensions.vector(1536),
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
  if p_embedding is not null then
    return (
      select coalesce(jsonb_agg(private.wish_card(c.w) || jsonb_build_object('similarity', round(c.sim::numeric, 3))
                                order by c.sim desc), '[]'::jsonb)
      from (
        select n.w, n.sim
        from (
          select w, 1 - (w.embedding <=> p_embedding) as sim
          from public.wishes w
          where w.deleted_at is null and w.embedding is not null
          order by w.embedding <=> p_embedding
          limit 20
        ) n
        where n.sim >= p_threshold
        order by n.sim desc
        limit v_limit
      ) c
    );
  end if;

  -- Fallback when the embeddings provider is unavailable: trigram match.
  perform set_config('pg_trgm.similarity_threshold', '0.45', true);
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
end;
$$;

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
        'created_at', l.created_at, 'developer', private.developer_json(d.id, d.github_handle, d.avatar_url))
        order by l.created_at, l.id)
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

create or replace function public.viewer_metoos(p_token_hash text, p_wish_ids bigint[])
returns bigint[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(m.wish_id), '{}')
  from public.metoos m
  join public.devices d on d.id = m.device_id
  where d.token_hash = p_token_hash and m.wish_id = any (p_wish_ids);
$$;

create or replace function public.ledger_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'counts', (
      select jsonb_build_object(
        'all', count(*),
        'open', count(*) filter (where status = 'open'),
        'being_built', count(*) filter (where status = 'being_built'),
        'fulfilled', count(*) filter (where status = 'fulfilled'))
      from public.wishes where deleted_at is null),
    'week', jsonb_build_object(
      'wishes', (select count(*) from public.wishes
                 where deleted_at is null and created_at > now() - interval '7 days'),
      'wishes_prev', (select count(*) from public.wishes
                      where deleted_at is null and created_at > now() - interval '14 days'
                        and created_at <= now() - interval '7 days'),
      'metoos', (select count(*) from public.metoos where created_at > now() - interval '7 days'),
      'fulfilled', (select count(*) from public.wishes
                    where deleted_at is null and fulfilled_at > now() - interval '7 days')),
    'most_wanted', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.text, 'metoo_count', t.metoo_count)
                       order by t.metoo_count desc, t.id desc)
      from (
        select id, text, metoo_count from public.wishes
        where deleted_at is null and status = 'open'
        order by metoo_count desc, id desc
        limit 5
      ) t), '[]'::jsonb)
  );
$$;

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
                   where f.wish_id = l.wish_id and f.deleted_at is null
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
        'created_at', dl.created_at, 'first_to_ship', dl.first_to_ship,
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

create or replace function public.developer_directory(p_limit integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(t.j order by t.links desc, t.building desc, t.created_at), '[]'::jsonb)
  from (
    select private.developer_json(d.id, d.github_handle, d.avatar_url) || jsonb_build_object('links', lc.n, 'building', cc.n) as j,
           lc.n as links, cc.n as building, d.created_at
    from public.developers d
    cross join lateral (
      select count(*) as n from public.links l
      join public.wishes w on w.id = l.wish_id and w.deleted_at is null
      where l.developer_id = d.id and l.deleted_at is null) lc
    cross join lateral (
      select count(*) as n from public.claims c
      join public.wishes w on w.id = c.wish_id and w.deleted_at is null
      where c.developer_id = d.id) cc
    where d.github_handle !~ '~'
    order by lc.n desc, cc.n desc, d.created_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) t;
$$;

-- Sitemap: most recent 45k wishes plus developer handles (sitemaps cap at 50k URLs).
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
      select jsonb_agg(d.github_handle)
      from (
        select github_handle from public.developers
        where github_handle !~ '~' order by created_at desc limit 4000
      ) d), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon/authenticated, everything via service_role.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant usage on schema extensions to service_role;
grant usage on schema private to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all tables in schema private to service_role;
grant execute on all functions in schema public to service_role;
grant execute on all functions in schema private to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
