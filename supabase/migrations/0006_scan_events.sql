-- Scan hand: what the camera read, and what the player said it actually was.
--
-- The point of the open test is the difference between those two. A scan is
-- recorded whether or not it worked, and when the player saves the hand the
-- tiles they confirmed are written back onto the same row. scanned_tiles
-- against confirmed_tiles is the accuracy measure, and it needs no photo.
--
-- The endpoint is public during the test, so the caps are the only thing
-- between an API key and anyone who finds the URL. The check and the insert
-- are one transaction inside scan_claim below: counting in the server and
-- inserting afterwards would let two requests in at once pass the same cap.
--
-- Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- A random id kept in the browser. Trivially reset, so a soft limit only.
  device_id text not null,
  -- The IP, salted and hashed in the server. The raw address never arrives.
  ip_hash text not null,
  user_id uuid references auth.users(id) on delete set null,
  is_admin boolean not null default false,
  model_used text,
  used_fallback boolean not null default false,
  input_tokens integer,
  output_tokens integer,
  est_cost_usd numeric(12, 6),
  outcome text not null default 'error'
    check (outcome in ('ok', 'invalid', 'error', 'capped')),
  scanned_tiles jsonb,
  confirmed_tiles jsonb,
  photo_path text,
  -- Marked in the admin page to build the eval set.
  in_test_set boolean not null default false
);

comment on table public.scan_events is
  'One row per scan attempt. Written and read only by the server, using the '
  'service role key; row level security denies everyone else.';
comment on column public.scan_events.outcome is
  'ok, invalid (model read something that is not a hand), error (the call '
  'failed or the server stopped before finishing) or capped (refused). A row '
  'starts as error and is updated when the attempt finishes, so a server that '
  'dies mid-call leaves an honest record rather than a missing one.';
comment on column public.scan_events.confirmed_tiles is
  'The tiles the player saved. Null while a scan has not been saved, which is '
  'itself a signal: an abandoned scan is usually a bad one.';

-- The three rolling windows, plus the per-account one for when sign-in is on.
create index if not exists scan_events_device_idx
  on public.scan_events (device_id, created_at desc);
create index if not exists scan_events_ip_idx
  on public.scan_events (ip_hash, created_at desc);
create index if not exists scan_events_created_idx
  on public.scan_events (created_at desc);
create index if not exists scan_events_user_idx
  on public.scan_events (user_id, created_at desc)
  where user_id is not null;
-- The admin review list, newest first, and the export.
create index if not exists scan_events_test_set_idx
  on public.scan_events (created_at desc)
  where in_test_set;

-- Closed to everyone. The service role bypasses row level security, and it is
-- the only thing that touches this table; there is no policy to grant anon or
-- authenticated a way in, deliberately.
alter table public.scan_events enable row level security;

drop policy if exists scan_events_no_public_read on public.scan_events;
drop policy if exists scan_events_no_public_write on public.scan_events;

-- Claim a scan, or refuse it, in one transaction.
--
-- Caps come in as arguments rather than being written here, so the environment
-- stays the one place they are set and this function does not have to be
-- migrated to change a number.
--
-- A refusal is recorded too, as outcome 'capped', so the admin page can show
-- how often people hit the ceiling. Capped rows never count toward a cap
-- themselves, or one refusal would spend the next hour refusing everything.
drop function if exists public.scan_claim(text, text, uuid, boolean, integer, integer, integer, integer);
create function public.scan_claim(
  p_device_id text,
  p_ip_hash text,
  p_user_id uuid,
  p_is_admin boolean,
  p_device_cap integer,
  p_ip_cap integer,
  p_global_cap integer,
  p_account_cap integer
)
returns table (
  allowed boolean,
  scan_id uuid,
  reason text,
  remaining integer
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz := now() - interval '24 hours';
  v_device integer;
  v_ip integer;
  v_global integer;
  v_account integer;
  v_reason text := null;
  v_remaining integer;
  v_id uuid;
begin
  -- Serialise the counters for this device so two requests cannot both read a
  -- count of 59 and both be let through.
  perform pg_advisory_xact_lock(hashtextextended(p_device_id, 0));

  select count(*) into v_device
    from public.scan_events
    where device_id = p_device_id
      and created_at >= v_since
      and outcome <> 'capped';

  select count(*) into v_ip
    from public.scan_events
    where ip_hash = p_ip_hash
      and created_at >= v_since
      and outcome <> 'capped';

  select count(*) into v_global
    from public.scan_events
    where created_at >= v_since
      and outcome <> 'capped';

  if p_user_id is null then
    v_account := 0;
  else
    select count(*) into v_account
      from public.scan_events
      where user_id = p_user_id
        and created_at >= v_since
        and outcome <> 'capped';
  end if;

  -- An admin has one cap of their own and is not subject to the others: the
  -- point of the admin path is to be able to test while the test is paused.
  if p_is_admin then
    v_remaining := p_device_cap - v_device;
    if v_device >= p_device_cap then v_reason := 'admin'; end if;
  else
    -- Global first, so a paused test says so rather than blaming the device.
    v_remaining := least(
      p_device_cap - v_device,
      p_ip_cap - v_ip,
      p_global_cap - v_global
    );
    if v_global >= p_global_cap then
      v_reason := 'global';
    elsif p_user_id is not null and v_account >= p_account_cap then
      v_reason := 'account';
      v_remaining := least(v_remaining, p_account_cap - v_account);
    elsif v_device >= p_device_cap then
      v_reason := 'device';
    elsif v_ip >= p_ip_cap then
      v_reason := 'ip';
    end if;
    if p_user_id is not null then
      v_remaining := least(v_remaining, p_account_cap - v_account);
    end if;
  end if;

  insert into public.scan_events (
    device_id, ip_hash, user_id, is_admin, outcome
  ) values (
    p_device_id, p_ip_hash, p_user_id, p_is_admin,
    case when v_reason is null then 'error' else 'capped' end
  )
  returning id into v_id;

  return query select
    v_reason is null,
    case when v_reason is null then v_id else null::uuid end,
    v_reason,
    greatest(v_remaining, 0);
end;
$$;

revoke all on function public.scan_claim(text, text, uuid, boolean, integer, integer, integer, integer) from public, anon, authenticated;

-- How many are left, without claiming one. Feeds the "10 or fewer" notice and
-- the button's enabled state.
drop function if exists public.scan_remaining(text, uuid, boolean, integer, integer, integer, integer);
create function public.scan_remaining(
  p_device_id text,
  p_user_id uuid,
  p_is_admin boolean,
  p_device_cap integer,
  p_global_cap integer,
  p_account_cap integer,
  p_admin_cap integer
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    case when p_is_admin then
      p_admin_cap - (
        select count(*) from public.scan_events
        where device_id = p_device_id
          and created_at >= now() - interval '24 hours'
          and outcome <> 'capped'
      )
    else
      least(
        p_device_cap - (
          select count(*) from public.scan_events
          where device_id = p_device_id
            and created_at >= now() - interval '24 hours'
            and outcome <> 'capped'
        ),
        p_global_cap - (
          select count(*) from public.scan_events
          where created_at >= now() - interval '24 hours'
            and outcome <> 'capped'
        ),
        case when p_user_id is null then 2147483647 else
          p_account_cap - (
            select count(*) from public.scan_events
            where user_id = p_user_id
              and created_at >= now() - interval '24 hours'
              and outcome <> 'capped'
          )
        end
      )
    end
  )::integer;
$$;

revoke all on function public.scan_remaining(text, uuid, boolean, integer, integer, integer, integer) from public, anon, authenticated;

-- Opted-in photos. Private: no public read, and the server hands out signed
-- URLs to the admin page rather than making the bucket readable.
insert into storage.buckets (id, name, public)
values ('scan-photos', 'scan-photos', false)
on conflict (id) do update set public = false;

-- Photos are deleted after 90 days. The row stays, because the tiles are the
-- data worth keeping; only the image goes.
create or replace function public.scan_photos_expired()
returns table (path text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select photo_path
    from public.scan_events
    where photo_path is not null
      and created_at < now() - interval '90 days';
$$;

create or replace function public.scan_delete_expired_photos()
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp, storage
as $$
declare
  v_count integer := 0;
begin
  delete from storage.objects
    where bucket_id = 'scan-photos'
      and name in (select path from public.scan_photos_expired());
  get diagnostics v_count = row_count;

  update public.scan_events
    set photo_path = null
    where photo_path is not null
      and created_at < now() - interval '90 days';

  return v_count;
end;
$$;

-- Scheduled inside the database where the data is. If pg_cron is not enabled
-- on this project the schedule is skipped rather than failing the migration;
-- call scan_delete_expired_photos() from a scheduled function instead.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule('scan-photo-expiry')
      where exists (select 1 from cron.job where jobname = 'scan-photo-expiry');
    perform cron.schedule(
      'scan-photo-expiry',
      '17 3 * * *',
      $cron$select public.scan_delete_expired_photos();$cron$
    );
  else
    raise notice 'pg_cron not available: schedule scan_delete_expired_photos() elsewhere';
  end if;
exception when others then
  raise notice 'could not schedule photo expiry (%), schedule it elsewhere', sqlerrm;
end;
$$;
