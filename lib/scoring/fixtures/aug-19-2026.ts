import { OUR_TABLE } from '@/lib/rules/types';
import type { Hand, PlayerNames, Seat } from '../types';

/**
 * A real game played by the group, used as the engine's reference fixture and
 * seeded into the database as "Aug 19, 2026".
 *
 * Compact source form, as recorded from the spreadsheet:
 *   t: 'd' = Cheut Chung win, 's' = Zi Mo
 *   w: winner seat, f: discarder seat, p: points
 */
const RAW = [
  { t: 's', w: 0, p: 3 },
  { t: 's', w: 3, p: 6 },
  { t: 'd', w: 2, f: 1, p: 3 },
  { t: 'd', w: 2, f: 3, p: 3 },
  { t: 'd', w: 3, f: 1, p: 5 },
  { t: 'd', w: 2, f: 0, p: 6 },
  { t: 'd', w: 1, f: 0, p: 4 },
  { t: 'd', w: 3, f: 2, p: 3 },
  { t: 'd', w: 1, f: 2, p: 5 },
  { t: 's', w: 2, p: 3 },
  { t: 'd', w: 3, f: 2, p: 3 },
  { t: 's', w: 2, p: 4 },
  { t: 's', w: 2, p: 5 },
  { t: 's', w: 1, p: 6 },
  { t: 's', w: 2, p: 5 },
  { t: 'd', w: 3, f: 1, p: 3 },
  { t: 's', w: 0, p: 5 },
  { t: 'd', w: 0, f: 1, p: 4 },
  { t: 'd', w: 0, f: 2, p: 4 },
] as const;

export const AUG_19_2026_HANDS: readonly Hand[] = RAW.map((row) =>
  row.t === 's'
    ? { type: 'zi_mo', winnerSeat: row.w as Seat, faan: row.p }
    : {
        type: 'ceot_cung',
        winnerSeat: row.w as Seat,
        discarderSeat: (row as { f: number }).f as Seat,
        faan: row.p,
      },
);

/** Players by seat: East, South, West, North. */
export const AUG_19_2026_PLAYERS: PlayerNames = ['Player A', 'Player B', 'Player C', 'Player D'];

export const AUG_19_2026_PENALTY = 13;

/** The group's own table, which is what this game was played under. */
export const AUG_19_2026_RULES = OUR_TABLE;

export const AUG_19_2026_GAME = {
  players: AUG_19_2026_PLAYERS,
  rules: AUG_19_2026_RULES,
  hands: AUG_19_2026_HANDS,
};

export const AUG_19_2026_DATE = '2026-08-19';
