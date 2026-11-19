-- Liability payments (包, baau): one player pays what the whole table would
-- have paid between them. Several Hong Kong rules work this way and they
-- differ only in why, so the reason is a text id from the table's own list
-- rather than an enum. A table inventing a rule needs a label, not a
-- migration.
--
-- The app can never detect one of these. It does not see which tile was fed
-- or which sets were exposed, so the scorekeeper marks it.
--
-- Three columns rather than one jsonb blob, because liable_seat is
-- constrained against winner_seat below and a check cannot reach inside
-- jsonb cleanly. adjustment stays a blob: four numbers and a note, with no
-- relational meaning.
--
-- Requires 0007. Safe to run more than once.

alter table public.hands
  add column if not exists liable_seat smallint,
  add column if not exists liability_reason text,
  add column if not exists adjustment jsonb;

comment on column public.hands.liable_seat is
  'Seat paying for the whole table on this hand, or null. Never the winner.';

comment on column public.hands.liability_reason is
  'Which house rule made them liable, where it was recorded: twelve_pieces, kong_self_draw, big_three_dragons, nine_pieces, fifth_tile, or other. Null on hands that only say somebody paid.';

comment on column public.hands.adjustment is
  'Hand-entered deltas replacing the computed ones: {"amounts":[n,n,n,n],"note":"..."}. The four must sum to zero.';

-- A liability belongs to a win and is never the winner's own. The reason is
-- not required: the record sheet offers the rules as examples of what the
-- question covers rather than asking which one applied, so most hands carry
-- a payer and no name. A name without a payer is still nothing, though.
alter table public.hands drop constraint if exists hands_liability_shape;
alter table public.hands
  add constraint hands_liability_shape check (
    (liability_reason is null or liable_seat is not null)
    and (liable_seat is null or liable_seat between 0 and 3)
    and (liable_seat is null or type in ('ceot_cung', 'zi_mo'))
    and (liable_seat is null or liable_seat is distinct from winner_seat)
  );

-- The shared view returns whatever a hand carries, or a shared game shows
-- the wrong payouts rather than merely missing a column.
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
  recorded_at timestamptz,
  liable_seat smallint,
  liability_reason text,
  adjustment jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.seq, h.type, h.winner_seat, h.discarder_seat, h.offender_seat,
         h.faan, h.patterns, h.is_limit, h.tiles, h.recorded_at,
         h.liable_seat, h.liability_reason, h.adjustment
    from public.hands h
    join public.games g on g.id = h.game_id
   where g.share_slug = slug
   order by h.seq;
$$;

revoke all on function public.shared_game_hands(text) from public;
grant execute on function public.shared_game_hands(text) to anon, authenticated;
