/**
 * Core types for the Hong Kong mahjong scoring engine.
 *
 * The engine is pure: it never touches storage, React, or the network, and it
 * never stores derived state. Dealer and prevailing round are always recomputed
 * by replaying the hand list, so editing or deleting a past hand recalculates
 * everything after it.
 */

import type { Rules } from '@/lib/rules/types';

/** Fixed seats for the whole game. Seat 0 deals first. */
export type Seat = 0 | 1 | 2 | 3;

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** A tuple indexed by seat, so seat order can never be mixed up. */
export type BySeat<T> = readonly [T, T, T, T];

export type Deltas = BySeat<number>;
export type PlayerNames = BySeat<string>;

export type Wind = 'east' | 'south' | 'west' | 'north';

export const WINDS: readonly Wind[] = ['east', 'south', 'west', 'north'];

/** Wind characters, used for both seats and prevailing rounds. */
export const WIND_CHARS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

/** Dealer marker. */
export const DEALER_CHAR = '莊';

export type HandType = 'ceot_cung' | 'zi_mo' | 'zaa_wu' | 'draw';

/** Faan values a hand can be worth under a set of rules, for chips and columns. */
export function faanValues(rules: Rules): number[] {
  const values: number[] = [];
  for (let faan = rules.minFaan; faan <= rules.faanCap; faan += 1)
    values.push(faan);
  return values;
}

/**
 * One player paying what the whole table would have paid.
 *
 * Several Hong Kong rules work this way - 十二張包自摸, 槓上花, 包大三元 and
 * others - and they share a shape: somebody did a thing that makes the rest
 * of the table's losses theirs. The app cannot detect any of them, because it
 * never sees which tile was fed or which sets were exposed, so the
 * scorekeeper marks it and the engine only moves the money.
 *
 * `reason` is an id from the table's own list rather than a union, so a table
 * inventing a rule needs a label and never new arithmetic.
 */
export interface Liability {
  seat: Seat;
  reason: string;
}

/**
 * Four amounts entered by hand, replacing whatever the rules would have
 * computed.
 *
 * The escape hatch for a night that did something no rule here describes.
 * It must sum to zero, which is the one thing the engine will not bend on:
 * a hand that creates or destroys points is not a hand.
 */
export interface Adjustment {
  amounts: Deltas;
  note?: string;
}

/**
 * One completed hand. A discriminated union, so a Cheut Chung hand always carries
 * a discarder and a draw can never carry a winner.
 *
 * Liability sits on the two winning types only, so "no liability on a draw or
 * a false win" is a thing the compiler knows rather than a rule written down
 * somewhere and checked at the far end.
 */
export type Hand =
  | {
      type: 'ceot_cung';
      winnerSeat: Seat;
      discarderSeat: Seat;
      /** The hand's final faan, as saved. Never recalculated. */
      faan: number;
      /** Flagged as a limit hand, which may pay the cap. */
      isLimit?: boolean;
      /** Patterns chosen in the hand builder, absent when faan was tapped in. */
      patterns?: HandPattern[];
      /** The tiles tapped into the scorer, in the order they were tapped. */
      tiles?: string[];
      /** One player paying the table's losses, when a house rule says so. */
      liability?: Liability;
      /** Hand-entered amounts, replacing everything above. */
      adjustment?: Adjustment;
    }
  | {
      type: 'zi_mo';
      winnerSeat: Seat;
      faan: number;
      isLimit?: boolean;
      patterns?: HandPattern[];
      tiles?: string[];
      liability?: Liability;
      adjustment?: Adjustment;
    }
  | { type: 'zaa_wu'; offenderSeat: Seat; adjustment?: Adjustment }
  | { type: 'draw'; adjustment?: Adjustment };

/** One scoring pattern on a built hand. */
export interface HandPattern {
  id: string;
  count: number;
}

/** The rules-relevant shape of a game. Anything wider (a stored record) fits. */
export interface GameRules {
  readonly players: PlayerNames;
  readonly rules: Rules;
  /**
   * Scoring needs nothing but the hand. A stored hand carries a little more
   * with it - when it was written down - and the replay passes that through
   * to the rows it builds, so it is admitted here rather than cast back in.
   */
  readonly hands: readonly (Hand & { readonly recordedAt?: string })[];
}

/** The seat that won, or null for a draw or a false declaration. */
export function winnerOf(hand: Hand): Seat | null {
  return hand.type === 'ceot_cung' || hand.type === 'zi_mo'
    ? hand.winnerSeat
    : null;
}

/** The faan of a hand, or null where faan does not apply. */
export function faanOf(hand: Hand): number | null {
  return hand.type === 'ceot_cung' || hand.type === 'zi_mo' ? hand.faan : null;
}
