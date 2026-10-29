-- The hand scorer lets a player tap the tiles they won with, and works the
-- patterns out from them. Those tiles are worth keeping: they are what the
-- patterns were read off, so a hand can be reopened and checked rather than
-- taken on trust.
--
-- A column of its own rather than a corner of hands.patterns, because patterns
-- is an array of {id, count} and tiles are neither. Folding them in would mean
-- either a fake pattern entry or changing the column's shape, and 0003 only
-- just settled that shape.
--
-- Safe to run more than once.

alter table public.hands
  add column if not exists tiles jsonb;

comment on column public.hands.tiles is
  'Tiles tapped into the hand scorer, in tap order, as compact keys: '
  '"d1" the one of dots, "wE" the east wind, "rR" the red dragon. '
  'Null for a hand whose faan was entered directly.';

-- The shared view returns whatever a hand carries, so it has to carry this too.
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
  tiles jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.seq, h.type, h.winner_seat, h.discarder_seat, h.offender_seat,
         h.faan, h.patterns, h.is_limit, h.tiles
    from public.hands h
    join public.games g on g.id = h.game_id
   where g.share_slug = slug
   order by h.seq;
$$;

revoke all on function public.shared_game_hands(text) from public;
grant execute on function public.shared_game_hands(text) to anon, authenticated;
