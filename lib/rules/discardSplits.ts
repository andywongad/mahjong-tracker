import { glossOf } from '@/lib/terms';
import type { Rules } from './types';

/**
 * The ways a table can split a discard win, gentlest first.
 *
 * The thing tables most often disagree about, so it is asked in the rules
 * sheet and again in the walkthrough — from this one list, so the four can
 * never drift apart or fall out of step with what the engine does with them.
 *
 * One of them is marked as the one to suggest to a table still learning. The
 * mark travels with the data so both sheets order it the same way; only the
 * walkthrough says it out loud, because a sheet built for people who know
 * what they want does not need telling.
 */

/** The role word in lower case, for the middle of a sentence. */
const LOWER_SHOOTER = glossOf('cheut_chung').toLowerCase();

export interface DiscardSplit {
  id: string;
  label: string;
  detail: string;
  /** Units the discarder pays. */
  shooter: number;
  /** Units each other loser pays. */
  others: number;
  /** Suggest this one to a table that has not settled on its own rules. */
  recommended?: boolean;
}

export const DISCARD_SPLITS: DiscardSplit[] = [
  {
    id: 'shooter_face',
    label: `Only the ${LOWER_SHOOTER} pays, at face value`,
    detail: 'The winner collects the hand once, from the shooter alone',
    shooter: 1,
    others: 0,
    recommended: true,
  },
  {
    id: 'shared',
    label: `${glossOf('cheut_chung')} pays double, others pay one each`,
    detail: 'The whole table pays, the shooter pays most',
    shooter: 2,
    others: 1,
  },
  {
    id: 'shooter_only',
    label: `Only the ${LOWER_SHOOTER} pays, at double`,
    detail: 'The other two pay nothing',
    shooter: 2,
    others: 0,
  },
  {
    id: 'shooter_all',
    label: `Only the ${LOWER_SHOOTER} pays, the full amount`,
    detail: 'The shooter covers what all three would have paid',
    shooter: 4,
    others: 0,
  },
];

/** Which split a set of rules is using, or "custom" for a hand made one. */
export function splitIdFor(rules: Rules): string {
  const match = DISCARD_SPLITS.find(
    (split) =>
      split.shooter === rules.discardShooterMult &&
      split.others === rules.discardOthersMult,
  );
  return match?.id ?? 'custom';
}
