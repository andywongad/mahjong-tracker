-- Exercise scan_claim against the real function.
--
-- The caps are the only thing between a public endpoint and an API key, and
-- the counting lives in Postgres because it has to be atomic. Unit tests in
-- the app can only check that a refusal becomes a 429; this checks that the
-- refusal happens at the right time.
--
-- Paste into the Supabase SQL editor and run. Everything happens inside a
-- transaction that rolls back, so it leaves no rows behind. It raises an
-- exception on the first failure and prints "ALL CAP TESTS PASSED" otherwise.

begin;

do $$
declare
  r record;
  dev text := 'test-device-' || gen_random_uuid();
  dev2 text := 'test-device-' || gen_random_uuid();
  ip text := 'test-ip-' || gen_random_uuid();
  ip2 text := 'test-ip-' || gen_random_uuid();
  acct uuid := gen_random_uuid();
  n integer;
begin
  -- Nothing else is in the window for these made-up identities, so the global
  -- cap is set high except where it is the thing being tested.

  -- 1. The device cap lets three through and refuses the fourth.
  for n in 1..3 loop
    select * into r from public.scan_claim(dev, ip, null, false, 3, 100, 1000, 60);
    if not r.allowed then
      raise exception 'device cap: scan % was refused, expected allowed', n;
    end if;
  end loop;

  select * into r from public.scan_claim(dev, ip, null, false, 3, 100, 1000, 60);
  if r.allowed then raise exception 'device cap: the fourth scan was allowed'; end if;
  if r.reason <> 'device' then
    raise exception 'device cap: refused for %, expected device', r.reason;
  end if;

  -- 2. A refusal does not itself count, or one refusal would spend the rest
  --    of the day refusing everything that followed it.
  select count(*) into n from public.scan_events
    where device_id = dev and outcome <> 'capped';
  if n <> 3 then
    raise exception 'capped rows counted: % billable rows, expected 3', n;
  end if;

  -- 3. Raising the cap lets the next one through, proving the refusal above
  --    was the cap and not a stuck row.
  select * into r from public.scan_claim(dev, ip, null, false, 4, 100, 1000, 60);
  if not r.allowed then raise exception 'raising the device cap did not help'; end if;

  -- 4. The IP cap catches a second device behind the same address.
  select * into r from public.scan_claim(dev2, ip, null, false, 60, 4, 1000, 60);
  if r.allowed then raise exception 'ip cap: allowed a fifth on this address'; end if;
  if r.reason <> 'ip' then
    raise exception 'ip cap: refused for %, expected ip', r.reason;
  end if;

  -- 5. A different address is unaffected.
  select * into r from public.scan_claim(dev2, ip2, null, false, 60, 4, 1000, 60);
  if not r.allowed then raise exception 'a clean address was refused'; end if;

  -- 6. Anything older than the window does not count.
  insert into public.scan_events (device_id, ip_hash, outcome, created_at)
  select dev2, ip2, 'ok', now() - interval '25 hours'
  from generate_series(1, 50);

  select * into r from public.scan_claim(dev2, ip2, null, false, 3, 100, 1000, 60);
  if not r.allowed then
    raise exception 'rolling window: yesterday''s scans counted against today';
  end if;

  -- 7. The global ceiling outranks the rest, and says so, so the message can
  --    be "scanning is paused" rather than blaming this device.
  select * into r from public.scan_claim(
    'test-device-' || gen_random_uuid(), 'test-ip-' || gen_random_uuid(),
    null, false, 60, 150, 1, 60);
  if r.allowed then raise exception 'global cap: allowed past the ceiling'; end if;
  if r.reason <> 'global' then
    raise exception 'global cap: refused for %, expected global', r.reason;
  end if;

  -- 8. With sign-in on, the account is what is counted.
  for n in 1..2 loop
    select * into r from public.scan_claim(
      'test-device-' || gen_random_uuid(), 'test-ip-' || gen_random_uuid(),
      acct, false, 60, 150, 1000, 2);
    if not r.allowed then raise exception 'account cap: scan % refused', n; end if;
  end loop;

  select * into r from public.scan_claim(
    'test-device-' || gen_random_uuid(), 'test-ip-' || gen_random_uuid(),
    acct, false, 60, 150, 1000, 2);
  if r.allowed then raise exception 'account cap: allowed a third'; end if;
  if r.reason <> 'account' then
    raise exception 'account cap: refused for %, expected account', r.reason;
  end if;

  -- 9. An admin has their own cap and is not stopped by a paused test, which
  --    is the whole point of the admin path.
  select * into r from public.scan_claim(
    'test-admin-' || gen_random_uuid(), 'test-ip-' || gen_random_uuid(),
    null, true, 200, 1, 1, 60);
  if not r.allowed then
    raise exception 'admin: refused while the test was paused';
  end if;

  raise notice 'ALL CAP TESTS PASSED';
end;
$$;

rollback;
