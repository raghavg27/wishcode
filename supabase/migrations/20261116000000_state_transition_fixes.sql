-- Fixes for defects found by state transition tests.
--
-- 1. create_wish: two identical submits at the same moment made two wishes.
--    The device row is now locked before the duplicate check.
-- 2. Votes and subscriptions: a device could vote or subscribe while the same
--    device removed its me-too, and the vote or subscription stayed. The
--    eligibility check now locks the me-too row. Lock order is
--    me-too -> link -> wish on every write path.
-- 3. create_link: a developer could clear a flag by removing the link and
--    posting again. The new link now starts with the votes of the flagged one.
-- 4. subscribe: a second device that entered an address that was already
--    subscribed took the subscription away from the first device. An active
--    subscription now stays with its device while that device is eligible.
-- 5. report: after an admin dismissed a report, a new report from the same
--    device was dropped. It now opens the report again.
-- 6. remove_link: open reports on a removed link stayed open and hidden. They
--    are now resolved with the link.
-- 7. Stop all email had no way back. allow_emails and allow_developer_email
--    remove the address from email_suppressions. Only the signed link in an
--    email can call them, so only the owner of the inbox can turn email on.

-- True when the device is the wisher or has a me-too on the wish. Holds a
-- share lock on the me-too row until the transaction ends, so the me-too
-- cannot be removed between this check and the write that follows it.
create or replace function private.lock_eligible(p_wish_id bigint, p_device_id bigint)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if p_device_id is null then
    return false;
  end if;
  if exists (select 1 from public.wishes where id = p_wish_id and device_id = p_device_id) then
    return true;
  end if;
  perform 1 from public.metoos where wish_id = p_wish_id and device_id = p_device_id for share;
  return found;
end;
$$;

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

  -- One wish at a time for each device, so the check below sees a wish that
  -- a concurrent submit has just created.
  perform 1 from public.devices where id = v_device for no key update;

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

-- Sets (true/false) or clears (null) a device's verdict on a link.
create or replace function private.apply_verdict(p_device_id bigint, p_link_id bigint, p_works boolean, p_wish_id bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_link     public.links;
  v_deleted  timestamptz;
  v_eligible boolean;
begin
  -- The me-too lock comes before the link lock (me-too -> link -> wish).
  select private.lock_eligible(l.wish_id, p_device_id) into v_eligible
  from public.links l where l.id = p_link_id;

  select * into v_link from public.links where id = p_link_id for update;
  if not found or v_link.deleted_at is not null or (p_wish_id is not null and v_link.wish_id <> p_wish_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select deleted_at into v_deleted from public.wishes where id = v_link.wish_id;
  if v_deleted is not null then
    raise exception 'wish_removed' using errcode = 'P0001';
  end if;
  if not v_eligible then
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

  -- A flag stays with the developer on this wish: if the last link they
  -- removed here was flagged, the new link starts with its votes. The voters
  -- can change their votes on the new link.
  insert into public.verdicts (link_id, device_id, works)
  select v_id, v.device_id, v.works
  from public.verdicts v
  where v.link_id = (
    select l.id from public.links l
    where l.wish_id = p_wish_id and l.developer_id = p_developer_id and l.deleted_at is not null
    order by l.deleted_at desc, l.id desc
    limit 1)
    and exists (select 1 from public.links f where f.id = v.link_id and f.verdict = 'flagged');

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

  -- A removed link leaves the admin queue, so its open reports are closed.
  update public.reports
  set resolved_at = now(), resolved_by = p_developer_id
  where link_id = p_link_id and resolved_at is null;

  return (select jsonb_build_object('wish_id', id, 'status', status, 'link_count', link_count)
          from public.wishes where id = v_link.wish_id);
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
  if not private.lock_eligible(p_wish_id, v_device) then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.email_suppressions where email = v_email) then
    raise exception 'suppressed' using errcode = 'P0001';
  end if;

  -- An active subscription stays with its device while that device is
  -- eligible. The address is already subscribed, so there is nothing to do.
  select * into v_sub from public.subscriptions where wish_id = p_wish_id and email = v_email for update;
  if found and v_sub.unsubscribed_at is null
     and (v_sub.device_id = v_device or private.is_eligible(p_wish_id, v_sub.device_id)) then
    return jsonb_build_object('subscribed', true);
  end if;

  perform private.consume_rate_limit('device:subscribe:' || v_device, p_device_limit, interval '1 day');
  if p_ip_key is not null then
    perform private.consume_rate_limit('ip:subscribe:' || p_ip_key, p_ip_limit, interval '1 day');
  end if;

  -- Subscribing again after an unsubscribe moves the subscription to this
  -- device.
  insert into public.subscriptions as s (wish_id, device_id, email)
  values (p_wish_id, v_device, v_email)
  on conflict (wish_id, email) do update
    set device_id = excluded.device_id, unsubscribed_at = null;

  return jsonb_build_object('subscribed', true);
end;
$$;

-- Files a report. Reporting the same wish or link again from the same device
-- is a no-op and doesn't count against the limits, unless an admin dismissed
-- the earlier report: then the report opens again with the new reason.
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

  insert into public.reports as r (wish_id, link_id, device_id, reason)
  values (p_wish_id, p_link_id, v_device, p_reason)
  on conflict (wish_id, coalesce(link_id, 0), device_id) do update
    set reason = excluded.reason, created_at = now(), resolved_at = null, resolved_by = null
    where r.resolved_at is not null;
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

-- Turns Wishcode email on again for the address of a subscription. The
-- subscription for the wish stays off: the person subscribes again on the
-- wish page. Idempotent.
create or replace function public.allow_emails(p_subscription_id bigint)
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

  delete from public.email_suppressions where email = v_sub.email;
  return jsonb_build_object('wish_id', v_sub.wish_id);
end;
$$;

-- The same for the address of the developer of a link. Idempotent.
create or replace function public.allow_developer_email(p_link_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wish_id bigint;
  v_email   text;
begin
  select l.wish_id, lower(u.email) into v_wish_id, v_email
  from public.links l
  join auth.users u on u.id = l.developer_id
  where l.id = p_link_id and u.email is not null;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  delete from public.email_suppressions where email = v_email;
  return jsonb_build_object('wish_id', v_wish_id);
end;
$$;

revoke all on function private.lock_eligible(bigint, bigint) from public, anon, authenticated;
revoke all on function public.allow_emails(bigint) from public, anon, authenticated;
revoke all on function public.allow_developer_email(bigint) from public, anon, authenticated;
grant execute on function private.lock_eligible(bigint, bigint) to service_role;
grant execute on function public.allow_emails(bigint) to service_role;
grant execute on function public.allow_developer_email(bigint) to service_role;
