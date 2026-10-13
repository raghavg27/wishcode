-- Smoke test for the Wishcode schema. Run against a scratch database that has
-- the migration applied (never production):
--   psql "$SCRATCH_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
-- Everything runs in a transaction that is rolled back.

begin;
set local role service_role;

do $$
declare
  dev_a  uuid := '00000000-0000-0000-0000-00000000000a';
  dev_b  uuid := '00000000-0000-0000-0000-00000000000b';
  admin  uuid := '00000000-0000-0000-0000-0000000000ad';
  tok1   text := repeat('a', 64);
  tok2   text := repeat('b', 64);
  w1     bigint;
  w2     bigint;
  link_a bigint;
  r      jsonb;
  failed boolean;
begin
  -- Developers
  perform public.upsert_developer(dev_a, 1, 'alice', 'https://avatars.githubusercontent.com/u/1', false);
  perform public.upsert_developer(dev_b, 2, 'bob', null, false);
  perform public.upsert_developer(admin, 3, 'root', null, true);
  -- Handle taken over by a different GitHub account parks the old holder.
  perform public.upsert_developer('00000000-0000-0000-0000-0000000000cc', 4, 'Alice', null, false);
  assert (select github_handle from public.developers where github_id = 1) = 'alice~1', 'handle parked';
  perform public.upsert_developer(dev_a, 1, 'alice2', null, false);
  assert (select github_handle from public.developers where github_id = 1) = 'alice2', 'handle restored';

  -- Create wish: starts open with no me-toos (not even the wisher's).
  r := public.create_wish(tok1, 'ip1', 'A menu bar app that mutes my mic when my dog barks', null, 5, 50);
  w1 := (r->>'id')::bigint;
  assert (r->>'existing')::boolean = false;
  assert (select metoo_count from public.wishes where id = w1) = 0, 'no auto metoo';
  assert (select status from public.wishes where id = w1) = 'open';

  -- Double submit is idempotent.
  r := public.create_wish(tok1, 'ip1', 'a menu bar app that mutes my mic when my dog barks', null, 5, 50);
  assert (r->>'id')::bigint = w1 and (r->>'existing')::boolean, 'idempotent create';

  -- Text validation.
  failed := false;
  begin perform public.create_wish(tok1, 'ip1', 'too short', null, 5, 50);
  exception when others then failed := sqlerrm = 'invalid_text'; end;
  assert failed, 'short text rejected';

  -- Device rate limit (limit 2 here) rolls back the over-limit insert.
  r := public.create_wish(tok2, 'ip2', 'A CLI that explains docker build errors in plain English', null, 2, 50);
  w2 := (r->>'id')::bigint;
  perform public.create_wish(tok2, 'ip2', 'A browser extension that warns before emailing everyone', null, 2, 50);
  failed := false;
  begin perform public.create_wish(tok2, 'ip2', 'A habit tracker that lives in my bookmark bar forever', null, 2, 50);
  exception when others then failed := sqlerrm = 'rate_limited'; end;
  assert failed, 'device wish rate limit';
  assert (select count(*) from public.wishes w join public.devices d on d.id = w.device_id
          where d.token_hash = tok2) = 2, 'over-limit wish rolled back';

  -- Me-too toggle is idempotent in both directions.
  r := public.set_metoo(tok2, 'ip2', w1, true, 200, 2000);
  assert (r->>'metoo_count')::int = 1;
  r := public.set_metoo(tok2, 'ip2', w1, true, 200, 2000);
  assert (r->>'metoo_count')::int = 1, 'double metoo ignored';
  assert (select count(*) from public.live_metoos(tok2, array[w1, w2]) where mine) = 1, 'live metoos: mine';
  assert (select metoo_count from public.live_metoos(null, array[w1]) where wish_id = w1) = 1, 'live metoos: count';
  assert not exists (select 1 from public.live_metoos(null, array[w1, w2]) where mine), 'live metoos: no device';
  r := public.set_metoo(tok2, 'ip2', w1, false, 200, 2000);
  assert (r->>'metoo_count')::int = 0;
  r := public.set_metoo(tok2, 'ip2', w1, false, 200, 2000);
  assert (r->>'metoo_count')::int = 0, 'double un-metoo ignored';

  -- Page existence for the proxy's 404s.
  assert public.page_exists(w1, null) and not public.page_exists(-1, null), 'wish exists';
  assert public.page_exists(null, 'ALICE2') and not public.page_exists(null, 'nobody'), 'developer exists';

  -- Claims move Open -> Being built -> Open.
  r := public.set_claim(dev_a, w1, true, 200);
  assert r->>'status' = 'being_built';
  r := public.set_claim(dev_b, w1, true, 200);
  assert (r->>'claim_count')::int = 2;
  r := public.set_claim(dev_b, w1, false, 200);
  assert r->>'status' = 'being_built' and (r->>'claim_count')::int = 1;

  -- First link fulfils; second dev can add; same dev cannot add twice.
  r := public.create_link(dev_b, w1, 'https://barkmute.app', 'Mutes the mic', null, 20);
  assert r->>'status' = 'fulfilled';
  assert (select fulfilled_at from public.wishes where id = w1) is not null;
  r := public.create_link(dev_a, w1, 'https://other.app/x', 'Another take', 'https://github.com/a/b', 20);
  link_a := (r->>'id')::bigint;
  assert (r->>'link_count')::int = 2;
  failed := false;
  begin perform public.create_link(dev_a, w1, 'https://again.app', 'Again', null, 20);
  exception when others then failed := sqlerrm = 'already_linked'; end;
  assert failed, 'one link per developer';

  -- http and malformed urls are rejected by constraints.
  failed := false;
  begin perform public.create_link(dev_b, w2, 'http://insecure.app', 'nope', null, 20);
  exception when check_violation then failed := true; end;
  assert failed, 'http rejected';

  -- Feed + detail + profile shapes.
  perform public.set_metoo(tok2, 'ip2', w1, true, 200, 2000);
  r := public.get_wish(w1);
  assert jsonb_array_length(r->'links') = 2 and r->'first_link'->'developer'->>'handle' = 'bob';
  assert jsonb_array_length(public.ledger_feed(null, 'newest', null, null, null, 20)) = 3;
  assert jsonb_array_length(public.ledger_feed('fulfilled', 'top', null, null, null, 20)) = 1;
  r := public.ledger_feed(null, 'newest', null, null, null, 1);
  assert jsonb_array_length(public.ledger_feed(null, 'newest',
           (r->0->>'created_at')::timestamptz, null, (r->0->>'id')::bigint, 20)) = 2, 'cursor pagination';
  r := public.ledger_feed(null, 'top', null, null, null, 1);
  assert (r->0->>'id')::bigint = w1, 'top sort';
  assert jsonb_array_length(public.ledger_feed(null, 'top', null,
           (r->0->>'metoo_count')::int, (r->0->>'id')::bigint, 20)) = 2, 'top cursor pagination';
  r := public.developer_profile('ALICE2');
  assert (r->'stats'->>'links')::int = 1 and (r->'stats'->>'first_to_ship')::int = 0
     and (r->'stats'->>'building')::int = 0, 'profile stats';
  r := public.developer_profile('bob');
  assert (r->'stats'->>'first_to_ship')::int = 1, 'first to ship';
  assert jsonb_array_length(public.developer_directory(10)) >= 2;
  r := public.ledger_stats();
  assert (r->'counts'->>'fulfilled')::int = 1 and (r->'week'->>'wishes')::int = 3;
  assert jsonb_array_length(public.similar_wishes(null, 'A menu bar app that mutes my mic when the dog barks', 0.88, 3)) = 1,
    'trigram fallback';

  -- Removing links walks status back: Fulfilled -> Being built (claim remains).
  failed := false;
  begin perform public.remove_link(dev_b, link_a);
  exception when others then failed := sqlerrm = 'forbidden'; end;
  assert failed, 'cannot remove others link';
  r := public.remove_link(dev_a, link_a);
  assert r->>'status' = 'fulfilled';
  r := public.remove_link(admin, (select id from public.links where developer_id = dev_b and wish_id = w1));
  assert r->>'status' = 'being_built', 'back to being built';
  assert (select fulfilled_at from public.wishes where id = w1) is null;
  -- After removing, the developer may post again.
  r := public.create_link(dev_a, w1, 'https://v2.app', 'Second try', null, 20);
  assert r->>'status' = 'fulfilled';

  -- Admin delete hides the wish and blocks actions.
  failed := false;
  begin perform public.admin_delete_wish(dev_a, w2);
  exception when others then failed := sqlerrm = 'forbidden'; end;
  assert failed, 'non-admin cannot delete';
  perform public.admin_delete_wish(admin, w2);
  assert (public.get_wish(w2)->>'removed')::boolean and public.get_wish(w2)->>'text' is null;
  failed := false;
  begin perform public.set_metoo(tok1, 'ip1', w2, true, 200, 2000);
  exception when others then failed := sqlerrm = 'wish_removed'; end;
  assert failed, 'metoo on removed wish';
  assert jsonb_array_length(public.ledger_feed(null, 'newest', null, null, null, 20)) = 2;

  raise notice 'smoke: all assertions passed';
end;
$$;

reset role;

-- Privileges: anon and authenticated can touch nothing.
set local role anon;
do $$
declare failed boolean := false;
begin
  begin perform public.ledger_feed(null, 'newest', null, null, null, 1);
  exception when insufficient_privilege then failed := true; end;
  assert failed, 'anon cannot execute';
  failed := false;
  begin perform 1 from public.wishes limit 1;
  exception when insufficient_privilege then failed := true; end;
  assert failed, 'anon cannot select';
  raise notice 'privileges: ok';
end;
$$;

rollback;
