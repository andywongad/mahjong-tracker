/**
 * House rules.
 *
 * Scores are always derived by replaying the hand list against these rules, so
 * changing a rule recalculates the whole game. Only the hand's final faan is
 * stored, never the resulting points.
 */

export type PresetId = 'our_table' | 'hk_standard' | 'custom';
export type CurveKind = 'linear' | 'doubling' | 'custom';

export interface Rules {
  preset: PresetId;
  /** Hands below this cannot be saved as a win. */
  minFaan: number;
  /** Faan is clamped to this before the curve is applied. */
  faanCap: number;
  /** A hand flagged as a limit hand pays the cap whatever its own faan. */
  limitPaysCap: boolean;
  curve: CurveKind;
  /** faan to unit, used when curve is custom. */
  customCurve?: Record<number, number>;
  /** On a self drawn win, each loser pays this many units. */
  selfDrawEachMult: number;
  /** On a discard win, the discarder pays this many units. */
  discardShooterMult: number;
  /** On a discard win, each other loser pays this many units. */
  discardOthersMult: number;
  /** Any payment to or from the dealer is multiplied by this. 1 turns it off. */
  dealerMult: number;
  /** Faan the hand builder adds for a self drawn win. 0 turns it off. */
  selfDrawBonusFaan: number;
  /** Paid by the offender to each other player on a false win. */
  zaaWuPenalty: number;
  /** Show the New 6 patterns in the hand builder. */
  newSix: boolean;
  /** Show Seven Pairs in the hand builder. */
  sevenPairs: boolean;
  /** Money per point, for settle up. 0 hides money. */
  baseUnit: number;
  currency: string;
}

/** The Hong Kong doubling curve, faan to unit. */
export const DOUBLING_CURVE: Record<number, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
  10: 128,
  11: 192,
  12: 256,
  13: 384,
};

/**
 * The group's own table. Algebraically identical to the original engine:
 * a discard win pays 2 + 1 + 1 units, so the winner takes 4 faan worth, and a
 * self drawn win pays 2 units each, so the winner takes 6.
 */
export const OUR_TABLE: Rules = {
  preset: 'our_table',
  minFaan: 3,
  faanCap: 13,
  limitPaysCap: true,
  curve: 'linear',
  selfDrawEachMult: 2,
  discardShooterMult: 2,
  discardOthersMult: 1,
  dealerMult: 1,
  selfDrawBonusFaan: 0,
  zaaWuPenalty: 13,
  newSix: false,
  sevenPairs: false,
  baseUnit: 0,
  currency: '$',
};

/**
 * Hong Kong standard scoring: doubling curve, and only the discarder pays on a
 * discard win.
 *
 * The false win penalty defaults to the unit at the cap, which keeps the rule
 * reading the same across curves: it costs a limit hand. Under the linear curve
 * that is 13, matching Our table; under doubling with a cap of 13 it is 384.
 */
export const HK_STANDARD: Rules = {
  preset: 'hk_standard',
  minFaan: 3,
  faanCap: 13,
  limitPaysCap: true,
  curve: 'doubling',
  selfDrawEachMult: 1,
  discardShooterMult: 2,
  discardOthersMult: 0,
  dealerMult: 1,
  selfDrawBonusFaan: 1,
  zaaWuPenalty: DOUBLING_CURVE[13],
  newSix: true,
  sevenPairs: false,
  baseUnit: 0,
  currency: '$',
};

export const PRESETS: Record<Exclude<PresetId, 'custom'>, Rules> = {
  our_table: OUR_TABLE,
  hk_standard: HK_STANDARD,
};

/** Fields that describe scoring, so a change to any of them means "Custom". */
const SCORING_FIELDS: (keyof Rules)[] = [
  'minFaan',
  'faanCap',
  'limitPaysCap',
  'curve',
  'customCurve',
  'selfDrawEachMult',
  'discardShooterMult',
  'discardOthersMult',
  'dealerMult',
  'selfDrawBonusFaan',
  'zaaWuPenalty',
  'newSix',
  'sevenPairs',
];

/**
 * Which preset a set of rules matches, or "custom". Money settings are ignored
 * because they do not change any score.
 */
export function presetFor(rules: Rules): PresetId {
  for (const [id, preset] of Object.entries(PRESETS)) {
    const same = SCORING_FIELDS.every(
      (field) => JSON.stringify(rules[field]) === JSON.stringify(preset[field]),
    );
    if (same) return id as PresetId;
  }
  return 'custom';
}

/** Apply an edit, relabelling the preset if the change moves away from it. */
export function withRuleChange(rules: Rules, change: Partial<Rules>): Rules {
  const next = { ...rules, ...change };
  return { ...next, preset: presetFor(next) };
}
