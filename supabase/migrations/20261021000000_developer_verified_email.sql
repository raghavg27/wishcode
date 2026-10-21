-- Email the developer when their link becomes verified.
--
-- The address is the one GitHub gave Supabase Auth (auth.users.email). Each
-- link is emailed at most once: claim_verified_notification stamps
-- links.verified_notified_at and returns the email's content in one
-- statement, so concurrent votes can't both send. A link that loses and
-- regains verified status stays claimed. Addresses in email_suppressions get
-- nothing, and the email's stop link adds the developer's address there.
--
-- auth.users is only readable by its owner, so the three functions that
-- touch it are security definer and service_role only.

alter table public.links add column verified_notified_at timestamptz;

-- Links verified before this shipped never get the email.
update public.links set verified_notified_at = now() where verdict = 'verified';

-- Claims the verified email for a link and returns what it needs, or null
-- when there's nothing to send: not verified, already claimed, deleted, no
-- address on the auth user, or the address is suppressed. A link is claimed
-- even when there's no one to send to, so it's never reconsidered.
create or replace function public.claim_verified_notification(p_link_id bigint)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.links l
    set verified_notified_at = now()
    where l.id = p_link_id
      and l.verdict = 'verified'
      and l.verified_notified_at is null
      and l.deleted_at is null
    returning l.id, l.wish_id, l.developer_id, l.url, l.description, l.wisher_verdict, l.works_count
  )
  select jsonb_build_object(
    'wish_id', w.id,
    'wish_text', w.text,
    'link_id', c.id,
    'link_url', c.url,
    'description', c.description,
    'handle', d.github_handle,
    'wisher_verdict', coalesce(c.wisher_verdict, false),
    'works_count', c.works_count,
    'email', lower(u.email))
  from claimed c
  join public.wishes w on w.id = c.wish_id and w.deleted_at is null
  join public.developers d on d.id = c.developer_id
  join auth.users u on u.id = d.id
  where u.email is not null
    and not exists (select 1 from public.email_suppressions e where e.email = lower(u.email));
$$;

-- Which wish a developer email's link is for, for /e/unsubscribe. Null when
-- the developer has no address. Never returns the address.
create or replace function public.developer_email_context(p_link_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'wish_id', l.wish_id,
    'suppressed', exists (select 1 from public.email_suppressions e where e.email = lower(u.email)))
  from public.links l
  join auth.users u on u.id = l.developer_id
  where l.id = p_link_id and u.email is not null;
$$;

-- The developer email's stop link: turns off all Wishcode email for the
-- developer's address. Idempotent.
create or replace function public.suppress_developer_email(p_link_id bigint)
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

  insert into public.email_suppressions (email) values (v_email) on conflict do nothing;
  return jsonb_build_object('wish_id', v_wish_id);
end;
$$;

revoke all on function public.claim_verified_notification(bigint) from public, anon, authenticated;
revoke all on function public.developer_email_context(bigint) from public, anon, authenticated;
revoke all on function public.suppress_developer_email(bigint) from public, anon, authenticated;
grant execute on function public.claim_verified_notification(bigint) to service_role;
grant execute on function public.developer_email_context(bigint) to service_role;
grant execute on function public.suppress_developer_email(bigint) to service_role;
