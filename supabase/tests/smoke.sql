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

  -- Related wishes skip the wish itself and removed wishes; a removed wish has none.
  r := public.related_wishes(w1, 5);
  assert jsonb_array_length(r) = 1, 'related: the one other live wish';
  assert not r @> jsonb_build_array(jsonb_build_object('id', w1)), 'related: not itself';
  assert not r @> jsonb_build_array(jsonb_build_object('id', w2)), 'related: not removed';
  assert public.related_wishes(w2, 5) = '[]'::jsonb, 'related: removed wish has none';
  r := public.sitemap_entries();
  assert r->'developers' @> '[{"handle": "alice2"}]'::jsonb and (r->'developers'->0) ? 'updated_at', 'sitemap developer dates';
  assert not r->'wishes' @> jsonb_build_array(jsonb_build_object('id', w2)), 'sitemap skips removed wishes';

  raise notice 'smoke: all assertions passed';
end;
$$;

-- Verdicts, derived status and email subscriptions.
do $$
declare
  dev_c   uuid := '00000000-0000-0000-0000-00000000000c';
  dev_d   uuid := '00000000-0000-0000-0000-00000000000d';
  wisher  text := repeat('c', 64);
  m       text[] := array[repeat('1', 64), repeat('2', 64), repeat('3', 64), repeat('4', 64),
                          repeat('5', 64), repeat('6', 64), repeat('7', 64)];
  outsider text := repeat('e', 64);
  w       bigint;
  w_open  bigint;
  l1      bigint;
  l2      bigint;
  sub     bigint;
  r       jsonb;
  failed  boolean;
  i       integer;
begin
  perform public.upsert_developer(dev_c, 10, 'carol', null, false);
  perform public.upsert_developer(dev_d, 11, 'dave', null, false);
  w := (public.create_wish(wisher, 'ipw', 'A tiny app that reminds me to water my plants daily', null, 5, 50)->>'id')::bigint;
  for i in 1..7 loop perform public.set_metoo(m[i], 'ipm', w, true, 200, 2000); end loop;
  -- The outsider has a device (their own wish) but no me-too on w.
  perform public.create_wish(outsider, 'ipo', 'An outsider wish that exists only for this test', null, 5, 50);

  perform public.set_claim(dev_c, w, true, 200);
  l1 := (public.create_link(dev_c, w, 'https://plants.app', 'Waters plants', null, 20)->>'id')::bigint;
  assert (select status from public.wishes where id = w) = 'fulfilled', 'link fulfils';
  assert (select verdict from public.links where id = l1) = 'unverified', 'new link unverified';
  assert not (select verified from public.wishes where id = w), 'new link not verified';

  -- Wisher's works vote verifies with no crowd votes.
  r := public.set_verdict(wisher, l1, true);
  assert r->>'verdict' = 'verified' and (r->>'wisher_verdict')::boolean and (r->>'wish_verified')::boolean, 'wisher verifies';
  assert (select verified from public.wishes where id = w), 'wish verified';

  -- Wisher's no vote flags even with 5 works votes.
  for i in 1..5 loop perform public.set_verdict(m[i], l1, true); end loop;
  r := public.set_verdict(wisher, l1, false);
  assert r->>'verdict' = 'flagged' and (r->>'works_count')::int = 5, 'wisher flags over crowd';
  -- Only link flagged, claim remains: Being built, fulfilled_at cleared.
  assert (select status from public.wishes where id = w) = 'being_built', 'flagged -> being built';
  assert (select fulfilled_at from public.wishes where id = w) is null, 'fulfilled_at cleared';
  assert (select live_link_count from public.wishes where id = w) = 0
     and (select link_count from public.wishes where id = w) = 1, 'live vs all links';
  assert public.get_wish(w)->'first_link' = 'null'::jsonb, 'flagged link is not first_link';

  -- Wisher changes their mind: Fulfilled again.
  r := public.set_verdict(wisher, l1, true);
  assert r->>'wish_status' = 'fulfilled', 'unflag restores fulfilled';
  assert (select fulfilled_at from public.wishes where id = w) is not null, 'unflag restores fulfilled_at';

  -- Clearing the wisher's vote hands the decision to the crowd (5 works).
  r := public.set_verdict(wisher, l1, null);
  assert r->>'verdict' = 'verified' and r->'wisher_verdict' = 'null'::jsonb, 'crowd verifies';
  for i in 1..5 loop perform public.set_verdict(m[i], l1, null); end loop;
  assert (select verdict from public.links where id = l1) = 'unverified', 'all votes cleared';

  -- Crowd thresholds.
  perform public.set_verdict(m[1], l1, true);
  perform public.set_verdict(m[2], l1, true);
  assert (select verdict from public.links where id = l1) = 'unverified', '2 works -> unverified';
  perform public.set_verdict(m[3], l1, true);
  assert (select verdict from public.links where id = l1) = 'verified', '3 works -> verified';
  perform public.set_verdict(m[4], l1, false);
  perform public.set_verdict(m[5], l1, false);
  perform public.set_verdict(m[6], l1, false);
  assert (select verdict from public.links where id = l1) = 'flagged', '3 broken vs 3 works -> flagged';
  perform public.set_verdict(m[7], l1, true);
  assert (select verdict from public.links where id = l1) = 'verified', '4 works vs 3 broken -> verified';
  assert (select works_count from public.links where id = l1) = 4
     and (select broken_count from public.links where id = l1) = 3, 'counts';

  -- verified follows verified links, including deletion.
  l2 := (public.create_link(dev_d, w, 'https://water.app', 'Also waters', null, 20)->>'id')::bigint;
  assert (select verified from public.wishes where id = w), 'still verified with unverified second link';
  perform public.remove_link(dev_c, l1);
  assert not (select verified from public.wishes where id = w), 'verified cleared when verified link deleted';
  assert (select status from public.wishes where id = w) = 'fulfilled', 'unverified link still fulfils';

  -- Eligibility.
  failed := false;
  begin perform public.set_verdict(outsider, l2, true);
  exception when others then failed := sqlerrm = 'not_eligible'; end;
  assert failed, 'outsider cannot vote';
  failed := false;
  begin perform public.set_verdict(null, l2, true);
  exception when others then failed := sqlerrm = 'not_eligible'; end;
  assert failed, 'no device cannot vote';

  -- Removing a me-too deletes that device's verdicts and recomputes the link.
  perform public.set_verdict(m[1], l2, false);
  perform public.set_verdict(m[2], l2, false);
  perform public.set_verdict(m[3], l2, false);
  assert (select verdict from public.links where id = l2) = 'flagged', 'crowd flags';
  assert (select status from public.wishes where id = w) = 'being_built', 'only live link flagged';
  perform public.set_metoo(m[3], 'ipm', w, false, 200, 2000);
  assert not exists (select 1 from public.verdicts v join public.devices d on d.id = v.device_id
                     where d.token_hash = m[3]), 'verdicts removed with me-too';
  assert (select verdict from public.links where id = l2) = 'unverified', 'link recomputed';
  assert (select status from public.wishes where id = w) = 'fulfilled', 'wish recomputed';
  -- The wisher's own verdicts survive removing their me-too.
  perform public.set_metoo(wisher, 'ipw', w, true, 200, 2000);
  perform public.set_verdict(wisher, l2, true);
  perform public.set_metoo(wisher, 'ipw', w, false, 200, 2000);
  assert (select wisher_verdict from public.links where id = l2), 'wisher verdict kept';

  -- A flagged only link on an unclaimed wish drops to Open.
  w_open := (public.create_wish(wisher, 'ipw', 'A widget that shows the next train home from work', null, 5, 50)->>'id')::bigint;
  perform public.set_verdict(wisher, (public.create_link(dev_c, w_open, 'https://train.app', 'Trains', null, 20)->>'id')::bigint, false);
  assert (select status from public.wishes where id = w_open) = 'open', 'flagged -> open';

  -- Viewer state.
  r := public.viewer_wish_state(m[1], w);
  assert not (r->>'is_wisher')::boolean and (r->>'has_metoo')::boolean and not (r->>'subscribed')::boolean, 'viewer state';
  assert (r->'verdicts'->>l2::text)::boolean = false, 'viewer verdicts';
  r := public.viewer_wish_state(null, w);
  assert not (r->>'is_wisher')::boolean and not (r->>'has_metoo')::boolean and r->'verdicts' = '{}'::jsonb, 'no device';
  assert (public.viewer_wish_state(wisher, w)->>'is_wisher')::boolean, 'wisher state';

  -- Subscribe: eligibility, validation, idempotency, rate limit.
  failed := false;
  begin perform public.subscribe(outsider, 'ipo', w, 'out@example.com', 2, 100);
  exception when others then failed := sqlerrm = 'not_eligible'; end;
  assert failed, 'outsider cannot subscribe';
  failed := false;
  begin perform public.subscribe(m[1], 'ipm', w, 'not-an-email', 2, 100);
  exception when others then failed := sqlerrm = 'invalid_email'; end;
  assert failed, 'invalid email';
  r := public.subscribe(wisher, 'ipw', w, '  Wisher@Example.com ', 2, 100);
  assert (r->>'subscribed')::boolean, 'wisher subscribes';
  assert (select email from public.subscriptions where wish_id = w) = 'wisher@example.com', 'email normalised';
  perform public.subscribe(m[1], 'ipm', w, 'm1@example.com', 2, 100);
  perform public.subscribe(m[1], 'ipm', w, 'm1@example.com', 2, 100); -- idempotent: no limit used
  perform public.subscribe(m[1], 'ipm', w, 'm1b@example.com', 2, 100);
  failed := false;
  begin perform public.subscribe(m[1], 'ipm', w, 'm1c@example.com', 2, 100);
  exception when others then failed := sqlerrm = 'rate_limited'; end;
  assert failed, 'subscribe rate limit';
  assert (public.viewer_wish_state(m[1], w)->>'subscribed')::boolean, 'viewer subscribed';

  -- Notification recipients: wisher flag, unsubscribe, suppression.
  r := public.link_notification(l2);
  assert jsonb_array_length(r->'recipients') = 3 and r->>'handle' = 'dave', 'recipients';
  assert (select bool_and((x->>'is_wisher')::boolean = (x->>'email' = 'wisher@example.com'))
          from jsonb_array_elements(r->'recipients') x), 'is_wisher';
  sub := (select id from public.subscriptions where email = 'm1b@example.com');
  perform public.unsubscribe(sub, false);
  assert jsonb_array_length(public.link_notification(l2)->'recipients') = 2, 'unsubscribed excluded';
  -- Re-subscribing after unsubscribing reactivates and moves to this device.
  perform public.subscribe(m[2], 'ipm2', w, 'm1b@example.com', 5, 100);
  assert (select unsubscribed_at is null and device_id = (select id from public.devices where token_hash = m[2])
          from public.subscriptions where id = sub), 'resubscribe moves device';
  perform public.unsubscribe(sub, true);
  assert jsonb_array_length(public.link_notification(l2)->'recipients') = 2, 'suppressed excluded';
  failed := false;
  begin perform public.subscribe(m[2], 'ipm2', w, 'M1B@example.com', 5, 100);
  exception when others then failed := sqlerrm = 'suppressed'; end;
  assert failed, 'suppression not cleared by subscribing';
  r := public.subscription_context(sub);
  assert (r->>'wish_id')::bigint = w and (r->>'unsubscribed')::boolean and (r->>'suppressed')::boolean
     and r::text !~ '"email"', 'subscription context';
  assert public.subscription_context(-1) is null, 'unknown subscription';

  -- Removing a me-too ends that device's subscription.
  perform public.set_metoo(m[1], 'ipm', w, false, 200, 2000);
  assert not exists (select 1 from public.subscriptions where email like 'm1%' and unsubscribed_at is null),
    'un-me-too ends subscription';
  assert jsonb_array_length(public.link_notification(l2)->'recipients') = 1, 'only the wisher left';

  -- Votes from email count as the subscription's device and follow eligibility.
  sub := (select id from public.subscriptions where email = 'wisher@example.com');
  r := public.set_verdict_by_subscription(sub, l2, false);
  assert r->>'verdict' = 'flagged', 'email vote counts as wisher';
  failed := false;
  begin perform public.set_verdict_by_subscription(sub, (select id from public.links where wish_id = w_open), true);
  exception when others then failed := sqlerrm = 'not_found'; end;
  assert failed, 'email vote limited to its wish';
  failed := false;
  begin perform public.set_verdict_by_subscription((select id from public.subscriptions where email = 'm1@example.com'), l2, true);
  exception when others then failed := sqlerrm = 'not_eligible'; end;
  assert failed, 'email vote after un-me-too';

  -- Deleted links have no recipients.
  perform public.remove_link(dev_d, l2);
  assert jsonb_array_length(public.link_notification(l2)->'recipients') = 0, 'deleted link: no recipients';

  -- No read RPC exposes an email address.
  assert public.get_wish(w)::text !~ '"email"' and public.viewer_wish_state(wisher, w)::text !~ '"email"'
     and public.ledger_feed(null, 'newest', null, null, null, 50)::text !~ '"email"'
     and public.developer_profile('dave')::text !~ '"email"' and public.ledger_stats()::text !~ '"email"',
    'no email in read RPCs';

  raise notice 'verdicts and subscriptions: all assertions passed';
end;
$$;

-- Emailing developers when their link becomes verified.
do $$
declare
  dev_e   uuid := '00000000-0000-0000-0000-00000000000e';
  dev_f   uuid := '00000000-0000-0000-0000-00000000000f';
  wisher  text := repeat('f', 64);
  m       text[] := array[repeat('8', 64), repeat('9', 64), repeat('0', 64)];
  w       bigint;
  w2      bigint;
  l1      bigint;
  l2      bigint;
  l3      bigint;
  r       jsonb;
  failed  boolean;
  i       integer;
begin
  -- Supabase Auth owns auth.users; the app only reads it.
  reset role;
  insert into auth.users (id, email) values (dev_e, 'Erin@Example.com'), (dev_f, null);
  set local role service_role;

  perform public.upsert_developer(dev_e, 20, 'erin', null, false);
  perform public.upsert_developer(dev_f, 21, 'frank', null, false);
  w := (public.create_wish(wisher, 'ipx', 'An app that tells me when my train is about to leave', null, 5, 50)->>'id')::bigint;
  w2 := (public.create_wish(wisher, 'ipx', 'A widget that shows how long my coffee has been sitting out', null, 5, 50)->>'id')::bigint;
  for i in 1..3 loop perform public.set_metoo(m[i], 'ipn', w, true, 200, 2000); end loop;

  perform public.set_claim(dev_e, w, true, 200);
  l1 := (public.create_link(dev_e, w, 'https://train.example', 'Train alerts', null, 20)->>'id')::bigint;
  perform public.set_claim(dev_f, w, true, 200);
  l2 := (public.create_link(dev_f, w, 'https://train2.example', 'More train alerts', null, 20)->>'id')::bigint;

  -- Nothing to send until the link is verified.
  assert public.claim_verified_notification(l1) is null, 'unverified: nothing';
  assert (select verified_notified_at from public.links where id = l1) is null, 'unverified: not claimed';

  -- The wisher verifies: one email, to the developer's GitHub address.
  perform public.set_verdict(wisher, l1, true);
  r := public.claim_verified_notification(l1);
  assert r->>'email' = 'erin@example.com' and r->>'handle' = 'erin' and (r->>'wish_id')::bigint = w
     and r->>'wish_text' = 'An app that tells me when my train is about to leave'
     and r->>'link_url' = 'https://train.example' and (r->>'wisher_verdict')::boolean
     and (r->>'link_id')::bigint = l1, 'verified: notification';
  assert public.claim_verified_notification(l1) is null, 'claimed once';

  -- Losing and regaining verified status sends nothing more.
  perform public.set_verdict(wisher, l1, null);
  assert (select verdict from public.links where id = l1) = 'unverified', 'back to unverified';
  perform public.set_verdict(wisher, l1, true);
  assert public.claim_verified_notification(l1) is null, 'no second email';

  -- Crowd-verified, but GitHub gave no address: claimed, nothing to send.
  for i in 1..3 loop perform public.set_verdict(m[i], l2, true); end loop;
  assert (select verdict from public.links where id = l2) = 'verified', 'crowd verifies';
  r := public.claim_verified_notification(l2);
  assert r is null, 'no address: nothing';
  assert (select verified_notified_at from public.links where id = l2) is not null, 'no address: claimed';

  -- The email's stop link suppresses the developer's address.
  r := public.developer_email_context(l1);
  assert (r->>'wish_id')::bigint = w and not (r->>'suppressed')::boolean and r::text !~ '"email"', 'context';
  assert public.developer_email_context(l2) is null, 'context: no address';
  assert public.developer_email_context(-1) is null, 'context: unknown link';
  r := public.suppress_developer_email(l1);
  assert (r->>'wish_id')::bigint = w and r::text !~ '"email"', 'suppress';
  perform public.suppress_developer_email(l1);
  assert exists (select 1 from public.email_suppressions where email = 'erin@example.com'), 'suppressed lowercased';
  assert (public.developer_email_context(l1)->>'suppressed')::boolean, 'context: suppressed';
  failed := false;
  begin perform public.suppress_developer_email(l2);
  exception when others then failed := sqlerrm = 'not_found'; end;
  assert failed, 'suppress: no address';

  -- A suppressed address gets nothing, even for a newly verified link.
  perform public.set_claim(dev_e, w2, true, 200);
  l3 := (public.create_link(dev_e, w2, 'https://coffee.example', 'Coffee timer', null, 20)->>'id')::bigint;
  perform public.set_verdict(wisher, l3, true);
  assert public.claim_verified_notification(l3) is null, 'suppressed: nothing';

  -- Deleted links send nothing.
  delete from public.email_suppressions where email = 'erin@example.com';
  update public.links set verified_notified_at = null where id = l3;
  perform public.remove_link(dev_e, l3);
  assert public.claim_verified_notification(l3) is null, 'deleted link: nothing';

  raise notice 'developer verified emails: all assertions passed';
end;
$$;

-- Reports and the admin queue.
do $$
declare
  dev_g   uuid := '00000000-0000-0000-0000-000000000010';
  mod     uuid := '00000000-0000-0000-0000-000000000011';
  wisher  text := repeat('1', 64);
  rep     text[] := array[repeat('2', 64), repeat('3', 64), repeat('4', 64)];
  w       bigint;
  w2      bigint;
  l       bigint;
  q       jsonb;
  r       jsonb;
  failed  boolean;
begin
  perform public.upsert_developer(dev_g, 30, 'gina', null, false);
  perform public.upsert_developer(mod, 31, 'mod', null, true);
  w := (public.create_wish(wisher, 'ipr', 'An app that reminds me to water each of my plants', null, 5, 50)->>'id')::bigint;
  w2 := (public.create_wish(wisher, 'ipr', 'A keyboard shortcut that mutes every open browser tab', null, 5, 50)->>'id')::bigint;
  l := (public.create_link(dev_g, w, 'https://plants.app', 'Plant reminders', null, 20)->>'id')::bigint;
  perform public.set_claim(dev_g, w2, true, 5);

  -- One report per device per target; repeats are free.
  perform public.report(rep[1], 'ipq', w, null, 'spam', 2, 50);
  perform public.report(rep[1], 'ipq', w, null, 'abuse', 2, 50);
  perform public.report(rep[2], 'ipq', w, null, 'abuse', 2, 50);
  perform public.report(rep[1], 'ipq', w, l, 'malicious_link', 2, 50);
  assert (select count(*) from public.reports where wish_id = w) = 3, 'one report per device per target';

  -- Device limit (2 here) rolls back the over-limit report.
  failed := false;
  begin perform public.report(rep[1], 'ipq', w2, null, 'spam', 2, 50);
  exception when others then failed := sqlerrm = 'rate_limited'; end;
  assert failed, 'report rate limit';
  assert (select count(*) from public.reports where wish_id = w2) = 0, 'over-limit report rolled back';

  -- Bad targets.
  failed := false;
  begin perform public.report(rep[3], 'ipq', w2, l, 'spam', 2, 50);
  exception when others then failed := sqlerrm = 'not_found'; end;
  assert failed, 'link must belong to the wish';
  failed := false;
  begin perform public.report(rep[3], 'ipq', w2, null, 'malicious_link', 2, 50);
  exception when check_violation then failed := true; end;
  assert failed, 'malicious_link needs a link';
  perform public.report(rep[3], 'ipq', w2, null, 'personal_info', 2, 50);

  -- Only admins see the queue; the most reported target comes first.
  failed := false;
  begin perform public.admin_report_queue(dev_g, 50);
  exception when others then failed := sqlerrm = 'forbidden'; end;
  assert failed, 'non-admin queue';
  q := public.admin_report_queue(mod, 50);
  assert jsonb_array_length(q) = 3, 'three targets';
  assert (q->0->>'wish_id')::bigint = w and q->0->'link' = 'null'::jsonb and (q->0->>'report_count')::int = 2, 'wish first';
  assert (q->0->'reasons'->>'abuse')::int = 1 and (q->0->'reasons'->>'spam')::int = 1, 'reasons counted';

  -- Dismissing the link's reports leaves the wish's.
  failed := false;
  begin perform public.admin_resolve_reports(dev_g, w, l, false);
  exception when others then failed := sqlerrm = 'forbidden'; end;
  assert failed, 'non-admin resolve';
  failed := false;
  begin perform public.admin_resolve_reports(mod, w2, l, true);
  exception when others then failed := sqlerrm = 'not_found'; end;
  assert failed, 'link must belong to the wish when resolving';
  perform public.admin_resolve_reports(mod, w, l, false);
  assert (select deleted_at from public.links where id = l) is null, 'dismiss keeps the link';
  assert jsonb_array_length(public.admin_report_queue(mod, 50)) = 2, 'link reports resolved';

  -- Removing a wish resolves all its reports and returns its developers.
  r := public.admin_resolve_reports(mod, w, null, true);
  assert (public.get_wish(w)->>'removed')::boolean, 'wish removed';
  assert r->'handles' = '["gina"]'::jsonb, 'handles to refresh';
  assert not exists (select 1 from public.reports where wish_id = w and resolved_at is null), 'all resolved';
  failed := false;
  begin perform public.report(rep[3], 'ipq', w, null, 'spam', 2, 50);
  exception when others then failed := sqlerrm = 'wish_removed'; end;
  assert failed, 'cannot report a removed wish';

  -- Removing a link from the queue.
  l := (public.create_link(dev_g, w2, 'https://mute.app', 'Mute tabs', null, 20)->>'id')::bigint;
  perform public.report(rep[2], 'ipq', w2, l, 'malicious_link', 2, 50);
  r := public.admin_resolve_reports(mod, w2, l, true);
  assert (select deleted_at from public.links where id = l) is not null, 'link removed';
  assert r->'handles' = '["gina"]'::jsonb;
  q := public.admin_report_queue(mod, 50);
  assert jsonb_array_length(q) = 1 and q->0->'link' = 'null'::jsonb, 'only the wish report on w2 is left';

  raise notice 'reports: all assertions passed';
end;
$$;

reset role;

-- Privileges: anon and authenticated can touch nothing.
create temp table role_checks (role_name text);
insert into role_checks values ('anon'), ('authenticated');
grant select on role_checks to anon, authenticated;
do $$
declare
  rn     text;
  stmt   text;
  failed boolean;
begin
  for rn in select role_name from role_checks loop
    execute format('set local role %I', rn);
    foreach stmt in array array[
      'select public.ledger_feed(null, ''newest'', null, null, null, 1)',
      'select public.related_wishes(1, 5)',
      'select public.set_verdict(null, 1, true)',
      'select public.set_verdict_by_subscription(1, 1, true)',
      'select public.subscribe(null, null, 1, ''a@b.co'', 1, 1)',
      'select public.unsubscribe(1, false)',
      'select public.link_notification(1)',
      'select public.viewer_wish_state(null, 1)',
      'select public.subscription_context(1)',
      'select public.claim_verified_notification(1)',
      'select public.developer_email_context(1)',
      'select public.suppress_developer_email(1)',
      'select public.report(null, null, 1, null, ''spam'', 1, 1)',
      'select public.admin_report_queue(null, 1)',
      'select public.admin_resolve_reports(null, 1, null, false)',
      'select 1 from public.reports limit 1',
      'select 1 from public.wishes limit 1',
      'select 1 from public.verdicts limit 1',
      'select 1 from public.subscriptions limit 1',
      'select 1 from public.email_suppressions limit 1'
    ] loop
      failed := false;
      begin execute stmt;
      exception when insufficient_privilege then failed := true; end;
      assert failed, format('%s must not run: %s', rn, stmt);
    end loop;
    reset role;
  end loop;
  raise notice 'privileges: ok';
end;
$$;

rollback;
