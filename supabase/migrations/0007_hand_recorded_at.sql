-- When a hand was written down, as against when its row reached this
-- database. The two are not the same and the difference is the point: the app
-- is built to be used with no signal, so a night played on Monday can arrive
-- on Thursday.
--
-- created_at cannot answer this, and not only because it means something
-- else. A push replaces a game's hands wholesale - delete, then insert - so
-- every sync stamps every hand of that game with the same fresh created_at.
-- Reading it as the time a hand was played showed a game played on the 2nd
-- with all five of its hands recorded three minutes ago.
--
-- Nullable, because every hand played before this column existed has no
-- answer, and a default would invent one that nobody could tell from a real
-- time by looking.
--
-- Safe to run more than once.

alter table public.hands
  add column if not exists recorded_at timestamptz;

comment on column public.hands.recorded_at is
  'When the scorekeeper recorded this hand, from the clock of the device '
  'that recorded it. Null for a hand recorded before the app kept this. '
  'Distinct from created_at, which is when the row reached this database '
  'and is rewritten every time the game is pushed.';

-- The shared view returns whatever a hand carries, so it has to carry this
-- too, or a shared link shows every hand untimed.
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
  is_limit boolean,
  tiles jsonb,
  recorded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.seq, h.type, h.winner_seat, h.discarder_seat, h.offender_seat,
         h.faan, h.patterns, h.is_limit, h.tiles, h.recorded_at
    from public.hands h
    join public.games g on g.id = h.game_id
   where g.share_slug = slug
   order by h.seq;
$$;

revoke all on function public.shared_game_hands(text) from public;
grant execute on function public.shared_game_hands(text) to anon, authenticated;
