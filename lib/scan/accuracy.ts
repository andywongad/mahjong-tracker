/**
 * How close the camera got, measured against what the player saved.
 *
 * Comparison is by multiset, not by position. When a player fixes a misread
 * tile they take the wrong one out and tap the right one in, and a tapped tile
 * lands at the end of the row — so the corrected hand holds the same tiles in
 * a different order, and comparing position by position would score a correct
 * fix as a dozen errors.
 *
 * That makes the confusion pairs a heuristic rather than a fact. What is known
 * is which tiles the scan had too many of and which too few; which wrong tile
 * stood in for which right one is inferred by pairing those two lists. With a
 * single mistake in a hand, the usual case, the pairing is exact.
 */
export interface HandComparison {
  /** Every tile matched, ignoring order. */
  exact: boolean;
  /** Tiles the scan got right, counted as a multiset overlap. */
  correct: number;
  /** How many tiles the player ended up with. */
  total: number;
  /** Scanned-for-actual pairs, inferred from what was over and under. */
  confusions: { scanned: string; actual: string }[];
}

const countsOf = (tiles: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const tile of tiles) counts.set(tile, (counts.get(tile) ?? 0) + 1);
  return counts;
};

/** Everything in `a` that `b` does not account for, as a flat sorted list. */
function surplus(
  a: Map<string, number>,
  b: Map<string, number>,
): string[] {
  const out: string[] = [];
  for (const [tile, count] of a) {
    const extra = count - (b.get(tile) ?? 0);
    for (let i = 0; i < extra; i += 1) out.push(tile);
  }
  return out.sort();
}

export function compareHand(
  scanned: readonly string[],
  confirmed: readonly string[],
): HandComparison {
  const scannedCounts = countsOf(scanned);
  const confirmedCounts = countsOf(confirmed);

  let correct = 0;
  for (const [tile, count] of confirmedCounts)
    correct += Math.min(count, scannedCounts.get(tile) ?? 0);

  const over = surplus(scannedCounts, confirmedCounts);
  const under = surplus(confirmedCounts, scannedCounts);

  const confusions: HandComparison['confusions'] = [];
  for (let i = 0; i < Math.min(over.length, under.length); i += 1)
    confusions.push({ scanned: over[i]!, actual: under[i]! });

  return {
    exact:
      over.length === 0 && under.length === 0 && scanned.length === confirmed.length,
    correct,
    total: confirmed.length,
    confusions,
  };
}

export interface Totals {
  scans: number;
  devices: number;
  confirmed: number;
  exactHands: number;
  tilesCorrect: number;
  tilesTotal: number;
  fallbacks: number;
  costUsd: number;
  byDay: { day: string; scans: number }[];
  confusions: { scanned: string; actual: string; count: number }[];
  outcomes: Record<string, number>;
}

export interface ScanRow {
  created_at: string;
  device_id: string;
  used_fallback: boolean | null;
  est_cost_usd: number | string | null;
  outcome: string;
  scanned_tiles: { tiles?: string[] } | null;
  confirmed_tiles: { tiles?: string[] } | null;
}

export function summarise(rows: readonly ScanRow[]): Totals {
  const devices = new Set<string>();
  const byDay = new Map<string, number>();
  const confusions = new Map<string, number>();
  const outcomes: Record<string, number> = {};

  let confirmed = 0;
  let exactHands = 0;
  let tilesCorrect = 0;
  let tilesTotal = 0;
  let fallbacks = 0;
  let costUsd = 0;

  for (const row of rows) {
    devices.add(row.device_id);
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    outcomes[row.outcome] = (outcomes[row.outcome] ?? 0) + 1;
    if (row.used_fallback) fallbacks += 1;
    costUsd += Number(row.est_cost_usd ?? 0) || 0;

    const scanned = row.scanned_tiles?.tiles;
    const saved = row.confirmed_tiles?.tiles;
    if (!scanned || !saved) continue;

    confirmed += 1;
    const comparison = compareHand(scanned, saved);
    if (comparison.exact) exactHands += 1;
    tilesCorrect += comparison.correct;
    tilesTotal += comparison.total;
    for (const pair of comparison.confusions) {
      const key = `${pair.scanned}>${pair.actual}`;
      confusions.set(key, (confusions.get(key) ?? 0) + 1);
    }
  }

  return {
    scans: rows.length,
    devices: devices.size,
    confirmed,
    exactHands,
    tilesCorrect,
    tilesTotal,
    fallbacks,
    costUsd,
    byDay: [...byDay.entries()]
      .map(([day, scans]) => ({ day, scans }))
      .sort((a, b) => (a.day < b.day ? 1 : -1)),
    confusions: [...confusions.entries()]
      .map(([key, count]) => {
        const [scanned, actual] = key.split('>');
        return { scanned: scanned!, actual: actual!, count };
      })
      .sort((a, b) => b.count - a.count),
    outcomes,
  };
}
