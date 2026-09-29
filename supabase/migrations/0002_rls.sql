-- Row level security.
--
-- Owners read and write their own games. Anyone holding a share link gets read
-- only access to that one game, and to nothing else.
--
-- The share path deliberately does not open the tables to the anon role. A
-- policy like "anon may select any game whose share_slug is not null" would let
-- anyone with the public key read every shared game in the database. Instead the
-- share link is served by two security definer functions that take the slug and
-- return only the matching game, so an unknown slug reveals nothing and the
-- tables stay closed.

-- Every object below is dropped first, so the file can be run again safely.
alter table public.games enable row level security;
alter table public.hands enable row level security;

-- Owners, full access to their own games.

drop policy if exists games_select_own on public.games;
create policy games_select_own on public.games
  for select using (auth.uid() = owner_id);

drop policy if exists games_insert_own on public.games;
create policy games_insert_own on public.games
  for insert with check (auth.uid() = owner_id);

drop policy if exists games_update_own on public.games;
create policy games_update_own on public.games
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists games_delete_own on public.games;
create policy games_delete_own on public.games
  for delete using (auth.uid() = owner_id);

-- Hands inherit their permissions from the game they belong to.

drop policy if exists hands_select_own on public.hands;
create policy hands_select_own on public.hands
  for select using (
    exists (
      select 1 from public.games g
      where g.id = hands.game_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists hands_insert_own on public.hands;
create policy hands_insert_own on public.hands
  for insert with check (
    exists (
      select 1 from public.games g
      where g.id = hands.game_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists hands_update_own on public.hands;
create policy hands_update_own on public.hands
  for update using (
    exists (
      select 1 from public.games g
      where g.id = hands.game_id and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.games g
      where g.id = hands.game_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists hands_delete_own on public.hands;
create policy hands_delete_own on public.hands
  for delete using (
    exists (
      select 1 from public.games g
      where g.id = hands.game_id and g.owner_id = auth.uid()
    )
  );

-- The share link, read only, one game at a time.

create or replace function public.shared_game(slug text)
returns table (
  id uuid,
  date date,
  player_names text[],
  zaa_wu_penalty integer,
  share_slug text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.date, g.player_names, g.zaa_wu_penalty, g.share_slug, g.updated_at
    from public.games g
   where g.share_slug = slug;
$$;

create or replace function public.shared_game_hands(slug text)
returns table (
  id uuid,
  seq integer,
  type public.hand_type,
  winner_seat smallint,
  discarder_seat smallint,
  offender_seat smallint,
  points integer
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.seq, h.type, h.winner_seat, h.discarder_seat, h.offender_seat, h.points
    from public.hands h
    join public.games g on g.id = h.game_id
   where g.share_slug = slug
   order by h.seq;
$$;

-- Only the two share functions are reachable without a session. Note that the
-- owner_id is never returned, so a share link says nothing about the account.
revoke all on function public.shared_game(text) from public;
revoke all on function public.shared_game_hands(text) from public;
grant execute on function public.shared_game(text) to anon, authenticated;
grant execute on function public.shared_game_hands(text) to anon, authenticated;
