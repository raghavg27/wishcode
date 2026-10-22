-- Reports: anyone can flag a wish or a live link for an admin to review.
--
-- A report belongs to the reporting device, one per device per wish or link,
-- and new reports are rate limited per device and network like other
-- anonymous writes. Nothing is hidden automatically: reports queue up for an
-- admin, who removes the wish or link or dismisses its reports. Removing a
-- wish resolves every open report on it, including those on its links.

create type public.report_reason as enum ('spam', 'abuse', 'personal_info', 'illegal', 'malicious_link');

create table public.reports (
  id           bigint generated always as identity primary key,
  wish_id      bigint not null references public.wishes (id),
  -- Null when the report is about the wish itself.
  link_id      bigint references public.links (id),
  device_id    bigint not null references public.devices (id),
  reason       public.report_reason not null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.developers (id) on update cascade,
  check (reason <> 'malicious_link' or link_id is not null)
);
create unique index reports_one_per_device_idx on public.reports (wish_id, coalesce(link_id, 0), device_id);
create index reports_open_idx on public.reports (wish_id, link_id) where resolved_at is null;

alter table public.reports enable row level security;

create or replace function private.require_admin(p_developer_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (select 1 from public.developers where id = p_developer_id and is_admin) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

-- Files a report. Reporting the same wish or link again from the same device
-- is a no-op and doesn't count against the limits.
create or replace function public.report(
  p_token_hash   text,
  p_ip_key       text,
  p_wish_id      bigint,
  p_link_id      bigint,
  p_reason       public.report_reason,
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
  v_rows    integer;
begin
  select deleted_at into v_deleted from public.wishes where id = p_wish_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;
  if p_link_id is not null and not exists (
    select 1 from public.links where id = p_link_id and wish_id = p_wish_id and deleted_at is null
  ) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  v_device := private.ensure_device(p_token_hash);

  insert into public.reports (wish_id, link_id, device_id, reason)
  values (p_wish_id, p_link_id, v_device, p_reason)
  on conflict (wish_id, coalesce(link_id, 0), device_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    perform private.consume_rate_limit('device:report:' || v_device, p_device_limit, interval '1 day');
    if p_ip_key is not null then
      perform private.consume_rate_limit('ip:report:' || p_ip_key, p_ip_limit, interval '1 day');
    end if;
  end if;

  return jsonb_build_object('reported', true);
end;
$$;

-- Open reports grouped by what they're about, most reported first. Wishes and
-- links that are already gone drop out of the queue.
create or replace function public.admin_report_queue(p_developer_id uuid, p_limit integer)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform private.require_admin(p_developer_id);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'wish_id', t.wish_id,
      'wish_text', t.wish_text,
      'wish_created_at', t.wish_created_at,
      'link', t.link,
      'report_count', t.report_count,
      'reasons', t.reasons,
      'first_reported_at', t.first_at,
      'last_reported_at', t.last_at
    ) order by t.report_count desc, t.last_at desc)
    from (
      select
        w.id as wish_id,
        w.text as wish_text,
        w.created_at as wish_created_at,
        case when l.id is null then null else jsonb_build_object(
          'id', l.id, 'url', l.url, 'description', l.description, 'repo_url', l.repo_url,
          'developer', private.developer_json(d.id, d.github_handle, d.avatar_url))
        end as link,
        sum(g.n)::integer as report_count,
        jsonb_object_agg(g.reason, g.n) as reasons,
        min(g.first_at) as first_at,
        max(g.last_at) as last_at
      from (
        select r.wish_id, r.link_id, r.reason, count(*) as n, min(r.created_at) as first_at, max(r.created_at) as last_at
        from public.reports r
        where r.resolved_at is null
        group by r.wish_id, r.link_id, r.reason
      ) g
      join public.wishes w on w.id = g.wish_id and w.deleted_at is null
      left join public.links l on l.id = g.link_id
      left join public.developers d on d.id = l.developer_id
      where g.link_id is null or l.deleted_at is null
      group by w.id, l.id, d.id
      order by sum(g.n) desc, max(g.last_at) desc
      limit greatest(1, least(p_limit, 200))
    ) t
  ), '[]'::jsonb);
end;
$$;

-- Acts on a wish (p_link_id null) or one of its links: removes it when
-- p_remove, then resolves the open reports it covers. Returns the handles of
-- the developers whose profiles show it, so the app can refresh their caches.
create or replace function public.admin_resolve_reports(
  p_developer_id uuid,
  p_wish_id      bigint,
  p_link_id      bigint,
  p_remove       boolean
)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_admin(p_developer_id);
  if p_link_id is not null and not exists (select 1 from public.links where id = p_link_id and wish_id = p_wish_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_remove and p_link_id is null then
    perform public.admin_delete_wish(p_developer_id, p_wish_id);
  elsif p_remove then
    perform public.remove_link(p_developer_id, p_link_id);
  end if;

  update public.reports
  set resolved_at = now(), resolved_by = p_developer_id
  where resolved_at is null
    and wish_id = p_wish_id
    and (link_id is not distinct from p_link_id or (p_remove and p_link_id is null));

  return jsonb_build_object(
    'wish_id', p_wish_id,
    'handles', coalesce((
      select jsonb_agg(distinct d.github_handle)
      from public.developers d
      where d.id in (
        select l.developer_id from public.links l
        where l.wish_id = p_wish_id and (p_link_id is null or l.id = p_link_id)
        union
        select c.developer_id from public.claims c
        where c.wish_id = p_wish_id and p_link_id is null
      )
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on public.reports from public, anon, authenticated;
grant all on public.reports to service_role;
revoke all on all sequences in schema public from public, anon, authenticated;
grant all on all sequences in schema public to service_role;

revoke all on function private.require_admin(uuid) from public, anon, authenticated;
revoke all on function public.report(text, text, bigint, bigint, public.report_reason, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_report_queue(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_resolve_reports(uuid, bigint, bigint, boolean) from public, anon, authenticated;
grant execute on function private.require_admin(uuid) to service_role;
grant execute on function public.report(text, text, bigint, bigint, public.report_reason, integer, integer) to service_role;
grant execute on function public.admin_report_queue(uuid, integer) to service_role;
grant execute on function public.admin_resolve_reports(uuid, bigint, bigint, boolean) to service_role;
