-- Mahjong tracker schema.
--
-- Dealer and prevailing round are deliberately absent: they are derived by
-- replaying the hand list in the scoring engine, so editing or deleting a past
-- hand recalculates everything after it. Storing them would let the two drift.

create extension if not exists "pgcrypto";

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- Players by seat: index 0 East, 1 South, 2 West, 3 North. Seat 0 deals first.
  player_names text[] not null,
  zaa_wu_penalty integer not null default 13,
  share_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint games_four_players check (
    array_length(player_names, 1) = 4
  ),
  constraint games_penalty_non_negative check (zaa_wu_penalty >= 0)
);

create index if not exists games_owner_date_idx
  on public.games (owner_id, date desc, created_at desc);

create type public.hand_type as enum ('ceot_cung', 'zi_mo', 'zaa_wu', 'draw');

create table if not exists public.hands (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  -- Position in the game, starting at 0. Unique per game.
  seq integer not null,
  type public.hand_type not null,
  winner_seat smallint,
  discarder_seat smallint,
  offender_seat smallint,
  points integer,
  created_at timestamptz not null default now(),

  constraint hands_seq_non_negative check (seq >= 0),
  constraint hands_seats_in_range check (
    (winner_seat is null or winner_seat between 0 and 3)
    and (discarder_seat is null or discarder_seat between 0 and 3)
    and (offender_seat is null or offender_seat between 0 and 3)
  ),
  constraint hands_points_in_range check (
    points is null or points between 3 and 13
  ),
  -- Each hand type carries exactly the fields it needs, mirroring the
  -- discriminated union the scoring engine works with.
  constraint hands_shape_matches_type check (
    case type
      when 'ceot_cung' then
        winner_seat is not null
        and discarder_seat is not null
        and winner_seat <> discarder_seat
        and points is not null
        and offender_seat is null
      when 'zi_mo' then
        winner_seat is not null
        and points is not null
        and discarder_seat is null
        and offender_seat is null
      when 'zaa_wu' then
        offender_seat is not null
        and winner_seat is null
        and discarder_seat is null
        and points is null
      when 'draw' then
        winner_seat is null
        and discarder_seat is null
        and offender_seat is null
        and points is null
    end
  )
);

create unique index if not exists hands_game_seq_idx on public.hands (game_id, seq);
create index if not exists hands_game_idx on public.hands (game_id, seq);

-- Keep updated_at honest, and bump the game whenever its hands change so
-- clients can tell that something moved.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger games_touch_updated_at
  before update on public.games
  for each row execute function public.touch_updated_at();

create or replace function public.touch_game_from_hand()
returns trigger
language plpgsql
as $$
begin
  update public.games
     set updated_at = now()
   where id = coalesce(new.game_id, old.game_id);
  return coalesce(new, old);
end;
$$;

create trigger hands_touch_game
  after insert or update or delete on public.hands
  for each row execute function public.touch_game_from_hand();
