import type { Rules } from './types';

/**
 * The ways a table can pay a self drawn win, gentlest first.
 *
 * Nobody fed a self drawn hand, so there is no shooter to single out and the
 * only question is what each of the three pays. Tables answer it one of two
 * ways, and the difference is a doubling: either the hand is collected three
 * times over at face value, or everybody pays double and the winner takes six
 * times the hand.
 *
 * Which way a table plays usually follows from how it pays a discard. A table
 * where only the shooter pays is already giving a self draw a premium, since
 * three people pay instead of one; a table where everyone pays on a discard
 * tends to double here so that a self draw still beats one.
 *
 * Built the same way as DISCARD_SPLITS, from one list, so the sheet can never
 * drift from what the engine does with the numbers. The labels say the amount
 * rather than opening with "Everyone pays", which is already the name of a
 * preset here and would have put three buttons starting on the same two words
 * in front of a table trying to tell them apart.
 */

export interface SelfDrawSplit {
  id: string;
  label: string;
  detail: string;
  /** Units each of the other three pays. */
  each: number;
  /** Suggest this one to a table that has not settled on its own rules. */
  recommended?: boolean;
}

export const SELF_DRAW_SPLITS: SelfDrawSplit[] = [
  {
    id: 'each_face',
    label: 'Face value, one each',
    detail: 'The winner collects the hand three times',
    each: 1,
    recommended: true,
  },
  {
    id: 'each_double',
    label: 'Double, two each',
    detail: 'The winner collects the hand six times',
    each: 2,
  },
];

/** Which way a set of rules pays a self draw, or "custom" for a hand made one. */
export function selfDrawIdFor(rules: Rules): string {
  const match = SELF_DRAW_SPLITS.find(
    (split) => split.each === rules.selfDrawEachMult,
  );
  return match?.id ?? 'custom';
}
