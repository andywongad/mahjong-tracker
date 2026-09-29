-- Live updates for the share link, without opening the tables to anonymous
-- readers.
--
-- Anonymous viewers reach a shared game only through shared_game and
-- shared_game_hands. They have no select on games or hands, so Realtime's
-- postgres_changes would never deliver them anything: it checks row level
-- security before sending, and they cannot see the rows.
--
-- Instead the database broadcasts on a public topic named for the share slug,
-- and the payload is deliberately worthless: an event name and the game's
-- updated_at. The page treats it only as "something changed, refetch", and
-- refetches through the same two security definer functions. A spoofed message
-- on the public topic can therefore cause a wasted refetch and nothing else.
-- It can never put false scores on screen.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Broadcast a change on the game's topic
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_game_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_updated timestamptz;
  v_game_id uuid;
begin
  if tg_table_name = 'games' then
    -- games only broadcasts on update, so NEW is always present.
    v_slug := new.share_slug;
    v_updated := new.updated_at;
  else
    v_game_id := case when tg_op = 'DELETE' then old.game_id else new.game_id end;
    select g.share_slug, g.updated_at
      into v_slug, v_updated
      from public.games g
     where g.id = v_game_id;
  end if;

  if v_slug is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  perform realtime.send(
    -- Nothing sensitive: no scores, no names, no owner.
    jsonb_build_object('event', 'changed', 'updated_at', v_updated),
    'changed',
    'game:' || v_slug,
    -- Public topic. Anyone with the share link can listen, which is the point;
    -- the payload is a nudge, not data.
    false
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on function public.broadcast_game_change() is
  'Tells listeners on game:<share_slug> that something changed. Carries no game '
  'data, so the share page must refetch through the share functions.';

-- The trigger names begin with zz on purpose. Postgres fires triggers of the
-- same timing in alphabetical order, and hands_touch_game is what bumps the
-- game''s updated_at. Sorting last means the broadcast carries the new
-- timestamp rather than the one it is about to replace.
drop trigger if exists zz_hands_broadcast on public.hands;
create trigger zz_hands_broadcast
  after insert or update or delete on public.hands
  for each row execute function public.broadcast_game_change();

drop trigger if exists zz_games_broadcast on public.games;
create trigger zz_games_broadcast
  after update on public.games
  for each row execute function public.broadcast_game_change();

-- ---------------------------------------------------------------------------
-- Redundant index
-- ---------------------------------------------------------------------------

-- hands_game_seq_idx is unique on (game_id, seq) and serves every lookup that
-- hands_game_idx did, including ordering by seq within a game.
drop index if exists public.hands_game_idx;
