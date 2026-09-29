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

/**
 * Cantonese labels with the Chinese characters alongside, spelled the way the
 * group says them. Mostly Jyutping, except 出銃, which they write Cheut Chung.
 *
 * These are display strings only. The identifiers below (ceot_cung and friends)
 * are the stored values and deliberately do not move when a spelling changes.
 */
export const HAND_TYPE_LABELS: Record<
  HandType,
  { roman: string; hanzi: string; english: string }
> = {
  ceot_cung: { roman: 'Cheut Chung', hanzi: '出銃', english: 'Shooter' },
  zi_mo: { roman: 'Zi Mo', hanzi: '自摸', english: 'Self pick' },
  zaa_wu: { roman: 'Zaa Wu', hanzi: '詐糊', english: 'False win' },
  draw: { roman: 'Lau Guk', hanzi: '流局', english: 'Draw' },
};

/** Faan values a hand can be worth under a set of rules, for chips and columns. */
export function faanValues(rules: Rules): number[] {
  const values: number[] = [];
  for (let faan = rules.minFaan; faan <= rules.faanCap; faan += 1)
    values.push(faan);
  return values;
}

/**
 * One completed hand. A discriminated union, so a Cheut Chung hand always carries
 * a discarder and a draw can never carry a winner.
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
    }
  | {
      type: 'zi_mo';
      winnerSeat: Seat;
      faan: number;
      isLimit?: boolean;
      patterns?: HandPattern[];
    }
  | { type: 'zaa_wu'; offenderSeat: Seat }
  | { type: 'draw' };

/** One scoring pattern on a built hand. */
export interface HandPattern {
  id: string;
  count: number;
}

/** The rules-relevant shape of a game. Anything wider (a stored record) fits. */
export interface GameRules {
  readonly players: PlayerNames;
  readonly rules: Rules;
  readonly hands: readonly Hand[];
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
