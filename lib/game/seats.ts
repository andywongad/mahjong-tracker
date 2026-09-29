import type { Seat, Wind } from '@/lib/scoring';

/** Each seat's own wind. Seat 0 is East and deals first. */
export const SEAT_WINDS: Record<Seat, Wind> = {
  0: 'east',
  1: 'south',
  2: 'west',
  3: 'north',
};

/** One colour per player, held for the whole game. */
export const SEAT_COLOR_VARS: Record<Seat, string> = {
  0: 'var(--player-1)',
  1: 'var(--player-2)',
  2: 'var(--player-3)',
  3: 'var(--player-4)',
};

export function seatColor(seat: Seat): string {
  return SEAT_COLOR_VARS[seat];
}

/**
 * The filled form of a player's colour, dark enough to carry white text at
 * 4.5:1. Use this behind text; use seatColor for dots, lines and edges.
 */
export const SEAT_SOLID_VARS: Record<Seat, string> = {
  0: 'var(--player-1-solid)',
  1: 'var(--player-2-solid)',
  2: 'var(--player-3-solid)',
  3: 'var(--player-4-solid)',
};

export function seatSolid(seat: Seat): string {
  return SEAT_SOLID_VARS[seat];
}

/**
 * Where each seat sits on screen, laid out like a real table seen from East's
 * chair: East at the bottom, South on the right, West at the top, North on the
 * left.
 */
export const SEAT_POSITION: Record<Seat, 'bottom' | 'right' | 'top' | 'left'> =
  {
    0: 'bottom',
    1: 'right',
    2: 'top',
    3: 'left',
  };

/** Grid area names matching the table layout. */
export const SEAT_GRID_AREA: Record<Seat, string> = {
  0: 'bottom',
  1: 'right',
  2: 'top',
  3: 'left',
};
