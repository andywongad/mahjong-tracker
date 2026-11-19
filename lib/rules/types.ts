/**
 * House rules.
 *
 * Scores are always derived by replaying the hand list against these rules, so
 * changing a rule recalculates the whole game. Only the hand's final faan is
 * stored, never the resulting points.
 */

export type PresetId =
  | 'our_table'
  | 'hk_standard'
  | 'basic_points'
  | 'custom';
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
  /**
   * Which liability rules this table plays, in the order the record sheet
   * offers them. Empty hides the feature: a table that does not play 包
   * should never be asked about it.
   */
  liabilityReasons?: string[];
  /**
   * On a discard win where the liable player is not the one who fed it,
   * whether they share the bill or the liable player carries it alone.
   */
  liabilityWithDiscarder?: LiabilityWithDiscarder;
}

export type LiabilityWithDiscarder = 'split' | 'liable_pays_all';

/**
 * Every 包 rule the app knows, in the order the house rules offer them and
 * the record sheet repeats them. Ordered by how commonly they are played
 * rather than alphabetically, so the two most tables recognise come first.
 */
export const LIABILITY_REASONS = [
  'twelve_pieces',
  'kong_self_draw',
  'big_three_dragons',
  'nine_pieces',
  'fifth_tile',
];

/**
 * What a table plays when its rules were written before 包 existed here.
 *
 * All of them, which is a change of mind. One reason looked like the careful
 * default and was the wrong kind of careful: a table that has never been
 * asked the question got a single name and no sense of what the question
 * covers, which reads less like restraint than like the app knowing one
 * rule. The list is a list of examples, and a table wanting fewer says so in
 * the house rules.
 *
 * Offering a rule is not playing it. Nothing reaches a score until somebody
 * says one applied and who it applied to.
 */
export const DEFAULT_LIABILITY_REASONS = LIABILITY_REASONS;
export const DEFAULT_LIABILITY_WITH_DISCARDER: LiabilityWithDiscarder =
  'split';

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
 * Everyone pays on a discard, the shooter double. Algebraically identical to
 * the original engine this app replaced: a discard win pays 2 + 1 + 1 units, so
 * the winner takes 4 faan worth, and a self drawn win pays 2 units each, so the
 * winner takes 6.
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
  liabilityReasons: ['twelve_pieces'],
  liabilityWithDiscarder: 'split',
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
  liabilityReasons: ['twelve_pieces', 'kong_self_draw', 'big_three_dragons'],
  liabilityWithDiscarder: 'split',
};

/**
 * Hong Kong standard with the arithmetic taken out of it.
 *
 * Every rule about what counts is kept - the same minimum and cap, the self
 * draw bonus faan, the New 6 patterns - and only the money is flattened. A
 * hand is worth its faan, the shooter pays it once, and a self drawn hand is
 * that number from each of the three.
 *
 * It is what a table that does not want to look anything up plays: the
 * doubling curve is the part people reach for a chart over, and at 3 to 13
 * faan the difference between 8 and 64 points is the whole reason a night
 * needs an app. This keeps the counting and drops the chart.
 */
export const BASIC_POINTS: Rules = {
  preset: 'basic_points',
  minFaan: 3,
  faanCap: 13,
  limitPaysCap: true,
  curve: 'linear',
  selfDrawEachMult: 1,
  discardShooterMult: 1,
  discardOthersMult: 0,
  dealerMult: 1,
  selfDrawBonusFaan: 1,
  // A limit hand under this curve, so the rule still reads "a false win
  // costs you the biggest hand at the table".
  zaaWuPenalty: 13,
  newSix: true,
  sevenPairs: false,
  baseUnit: 0,
  currency: '$',
  liabilityReasons: ['twelve_pieces', 'kong_self_draw', 'big_three_dragons'],
  liabilityWithDiscarder: 'split',
};

export const PRESETS: Record<Exclude<PresetId, 'custom'>, Rules> = {
  our_table: OUR_TABLE,
  hk_standard: HK_STANDARD,
  basic_points: BASIC_POINTS,
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
  // How a shared liability settles moves money, so it tells two rule sets
  // apart. Which reasons are offered does not: that is a question about what
  // the record sheet shows, and two tables scoring identically are the same
  // rules whether or not one of them has heard of 九張包.
  'liabilityWithDiscarder',
];

/**
 * A rules object with the liability fields filled in.
 *
 * Every game stores a snapshot of its rules, and every snapshot taken before
 * this existed has neither field. Comparing those against a preset that now
 * has both would turn every game already played into "Custom rules", so the
 * defaults are applied when reading rather than written into saved games.
 * Nothing on disk is touched and nothing a table already played changes.
 */
function withLiabilityDefaults(rules: Rules): Rules {
  if (rules.liabilityWithDiscarder !== undefined) return rules;
  return {
    ...rules,
    liabilityWithDiscarder: DEFAULT_LIABILITY_WITH_DISCARDER,
  };
}

/** Which liability rules a table plays, for rules that predate the question. */
export function liabilityReasonsFor(rules: Rules): string[] {
  if (rules.liabilityReasons) return rules.liabilityReasons;
  const preset = presetFor(rules);
  if (preset !== 'custom') return PRESETS[preset].liabilityReasons ?? [];
  return DEFAULT_LIABILITY_REASONS;
}

/** How a shared liability settles, for rules that predate the question. */
export function liabilityWithDiscarderFor(
  rules: Rules,
): LiabilityWithDiscarder {
  return rules.liabilityWithDiscarder ?? DEFAULT_LIABILITY_WITH_DISCARDER;
}

/**
 * Which preset a set of rules matches, or "custom". Money settings are ignored
 * because they do not change any score.
 */
export function presetFor(rules: Rules): PresetId {
  const filled = withLiabilityDefaults(rules);
  for (const [id, preset] of Object.entries(PRESETS)) {
    const same = SCORING_FIELDS.every(
      (field) =>
        JSON.stringify(filled[field]) === JSON.stringify(preset[field]),
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
