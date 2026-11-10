import { unitFor } from './curve';
import type { Rules } from './types';

/**
 * Keeping a false win worth a limit hand when the curve moves under it.
 *
 * The penalty is a flat number of points, but the rule it stands for is "it
 * costs you a limit hand" - which is why a table on the doubling curve starts
 * at 384 and one on the linear curve at 13. Those are the same rule, written
 * in two currencies.
 *
 * Changing the curve used to leave the number behind. Pick Hong Kong standard
 * and then switch to a linear curve and the penalty stayed at 384 while every
 * hand at the table collapsed to a thirtieth of that, so a false win cost
 * about thirty limit hands. Nobody chose that; it was a leftover.
 *
 * Two things are left alone. A penalty the change itself moved, because
 * somebody stepping that number has just said what they want it to be. And a
 * penalty that was not on the old limit to begin with, because that is a
 * table that already said the same thing earlier.
 */
export function withTrackedPenalty(before: Rules, after: Rules): Rules {
  if (after.zaaWuPenalty !== before.zaaWuPenalty) return after;
  if (before.zaaWuPenalty !== unitFor(before.faanCap, before)) return after;
  const limit = unitFor(after.faanCap, after);
  if (after.zaaWuPenalty === limit) return after;
  return { ...after, zaaWuPenalty: limit };
}
