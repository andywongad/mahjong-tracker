-- Bring the schema up to the model the app actually uses.
--
-- 0001 was written before house rules, the hand builder and ending a game early
-- existed. It stores a single zaa_wu_penalty integer and calls a hand's value
-- "points". The app now stores a whole rules object per game and calls the value
-- faan, and the share functions cannot reproduce a score without the rules:
-- a penalty integer says nothing about the curve, the multipliers or the cap.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- games: a rules snapshot per game, plus how the game finished
-- ---------------------------------------------------------------------------

alter table public.games add column if not exists rules jsonb;
alter table public.games add column if not exists rule_set_name text;
alter table public.games add column if not exists ended_at timestamptz;

comment on column public.games.rules is
  'Snapshot of the house rules, never a reference to a saved set, so editing a '
  'set later cannot rewrite a game already played.';
comment on column public.games.ended_at is
  'Set when the scorekeeper called the game before the rounds ran out. Not '
  'derivable from the hands, which is why it is stored.';

-- Carry any existing penalty into the rules object. The group played the linear
-- table before rules were configurable, so that preset reproduces their scores.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'games'
       and column_name = 'zaa_wu_penalty'
  ) then
    execute $migrate$
      update public.games
         set rules = jsonb_build_object(
               'preset', 'our_table',
               'minFaan', 3,
               'faanCap', 13,
               'limitPaysCap', true,
               'curve', 'linear',
               'selfDrawEachMult', 2,
               'discardShooterMult', 2,
               'discardOthersMult', 1,
               'dealerMult', 1,
               'selfDrawBonusFaan', 0,
               'zaaWuPenalty', coalesce(zaa_wu_penalty, 13),
               'newSix', false,
               'sevenPairs', false,
               'baseUnit', 0,
               'currency', '$'
             ),
             rule_set_name = coalesce(rule_set_name, 'Our table')
       where rules is null
    $migrate$;
  end if;
end $$;

alter table public.games drop constraint if exists games_penalty_non_negative;
alter table public.games drop column if exists zaa_wu_penalty;

-- Every game must carry its rules; without them a score cannot be recomputed.
alter table public.games alter column rules set not null;

-- ---------------------------------------------------------------------------
-- hands: faan rather than points, plus what the builder recorded
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'hands'
       and column_name = 'points'
  ) then
    alter table public.hands rename column points to faan;
  end if;
end $$;

alter table public.hands add column if not exists patterns jsonb;
alter table public.hands add column if not exists is_limit boolean not null default false;

comment on column public.hands.faan is
  'The hand''s final faan, as saved. The rules turn it into points; it is never '
  'recalculated.';
comment on column public.hands.patterns is
  'What the hand builder recorded, as [{id, count}]. Null when the faan was '
  'tapped in directly.';

-- The old check hardcoded 3 to 13. Both ends are now per game rules, so the
-- database only insists the value is sane and lets the engine enforce the table.
alter table public.hands drop constraint if exists hands_points_in_range;
alter table public.hands drop constraint if exists hands_faan_in_range;
alter table public.hands add constraint hands_faan_in_range check (
  faan is null or (faan > 0 and faan <= 1000)
);

alter table public.hands drop constraint if exists hands_shape_matches_type;
alter table public.hands add constraint hands_shape_matches_type check (
  case type
    when 'ceot_cung' then
      winner_seat is not null
      and discarder_seat is not null
      and winner_seat <> discarder_seat
      and faan is not null
      and offender_seat is null
    when 'zi_mo' then
      winner_seat is not null
      and faan is not null
      and discarder_seat is null
      and offender_seat is null
    when 'zaa_wu' then
      offender_seat is not null
      and winner_seat is null
      and discarder_seat is null
      and faan is null
    when 'draw' then
      winner_seat is null
      and discarder_seat is null
      and offender_seat is null
      and faan is null
  end
);

-- ---------------------------------------------------------------------------
-- The share link has to return enough to recompute the game
-- ---------------------------------------------------------------------------

drop function if exists public.shared_game(text);
create function public.shared_game(slug text)
returns table (
  id uuid,
  date date,
  player_names text[],
  rules jsonb,
  rule_set_name text,
  ended_at timestamptz,
  share_slug text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.date, g.player_names, g.rules, g.rule_set_name,
         g.ended_at, g.share_slug, g.updated_at
    from public.games g
   where g.share_slug = slug;
$$;

drop function if exists public.shared_game_hands(text);
create function public.shared_game_hands(slug text)
returns table (
  id uuid,
  seq integer,
  type public.hand_type,
  winner_seat smallint,
  discarder_seat smallint,
  offender_seat smallint,
  faan integer,
  patterns jsonb,
  is_limit boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.seq, h.type, h.winner_seat, h.discarder_seat, h.offender_seat,
         h.faan, h.patterns, h.is_limit
    from public.hands h
    join public.games g on g.id = h.game_id
   where g.share_slug = slug
   order by h.seq;
$$;

-- The owner id is never returned, so a share link says nothing about the account.
revoke all on function public.shared_game(text) from public;
revoke all on function public.shared_game_hands(text) from public;
grant execute on function public.shared_game(text) to anon, authenticated;
grant execute on function public.shared_game_hands(text) to anon, authenticated;
