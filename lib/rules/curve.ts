import { DOUBLING_CURVE, type Rules } from './types';

/** Highest faan the doubling table defines. */
const DOUBLING_MAX = Math.max(...Object.keys(DOUBLING_CURVE).map(Number));

/**
 * Payment unit for a faan value.
 *
 * Faan is clamped to the cap first, so the curve is never asked about a value
 * above the table.
 */
export function unitFor(faan: number, rules: Rules): number {
  const clamped = Math.max(0, Math.min(Math.trunc(faan), rules.faanCap));

  switch (rules.curve) {
    case 'linear':
      return clamped;

    case 'doubling': {
      if (clamped <= DOUBLING_MAX) return DOUBLING_CURVE[clamped];
      // A cap above the published table keeps doubling from its last entry.
      return DOUBLING_CURVE[DOUBLING_MAX] * 2 ** (clamped - DOUBLING_MAX);
    }

    case 'custom': {
      const table = rules.customCurve ?? {};
      if (table[clamped] !== undefined) return table[clamped];
      // Fall back to the nearest lower entry, then to the faan itself.
      for (let faanBelow = clamped - 1; faanBelow >= 0; faanBelow -= 1) {
        if (table[faanBelow] !== undefined) return table[faanBelow];
      }
      return clamped;
    }
  }
}

/**
 * The faan a hand actually pays at.
 *
 * A hand flagged as a limit hand pays the cap when the table plays it that way,
 * whether its own faan is above or below the cap: Big Three Dragons at 8 faan
 * pays the same as Thirteen Orphans. With that rule off it pays its own faan,
 * clamped to the cap like any other hand.
 */
export function effectiveFaan(
  hand: { faan: number; isLimit?: boolean },
  rules: Rules,
): number {
  if (hand.isLimit && rules.limitPaysCap) return rules.faanCap;
  return Math.max(0, Math.min(Math.trunc(hand.faan), rules.faanCap));
}

/**
 * Money is only shown when a stake is set. Scores are in points; the stake
 * converts a point to money.
 */
export function moneyFor(points: number, rules: Rules): number | null {
  if (!rules.baseUnit) return null;
  return points * rules.baseUnit;
}

/** Rows for the payout preview in the rules sheet, faan by faan. */
export interface CurveRow {
  faan: number;
  unit: number;
  /** What the discarder pays on a discard win. */
  shooter: number;
  /** What each other player pays on a discard win. */
  others: number;
  /** What each loser pays on a self drawn win. */
  selfDrawEach: number;
  /** What the winner collects on a discard win. */
  discardWin: number;
  /** What the winner collects on a self drawn win. */
  selfDrawWin: number;
}

export function curvePreview(rules: Rules): CurveRow[] {
  const rows: CurveRow[] = [];
  for (let faan = rules.minFaan; faan <= rules.faanCap; faan += 1) {
    const unit = unitFor(faan, rules);
    const shooter = Math.round(unit * rules.discardShooterMult);
    const others = Math.round(unit * rules.discardOthersMult);
    const selfDrawEach = Math.round(unit * rules.selfDrawEachMult);
    rows.push({
      faan,
      unit,
      shooter,
      others,
      selfDrawEach,
      discardWin: shooter + others * 2,
      selfDrawWin: selfDrawEach * 3,
    });
  }
  return rows;
}
