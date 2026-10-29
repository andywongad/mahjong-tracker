import type { HandPattern, Seat, Wind } from '@/lib/scoring';
import type { Rules } from '@/lib/rules/types';
import {
  countTiles,
  isSuitKey,
  type BonusKey,
  type TileKey,
} from '@/lib/tiles';
import {
  isThirteenOrphans,
  splitHand,
  type Reading,
  type TileSet,
} from '@/lib/tiles/solver';
import { totalFor, type BuilderTotal } from './builder';

/**
 * Naming the patterns in a hand.
 *
 * Every pattern here is one of ours by id, so the faan comes from the catalog
 * and the game's rules rather than from anything written in this file. What
 * this knows is only which shapes earn which name.
 */

export interface HandContext {
  /** The winner's own wind, taken from their seat. */
  seatWind: Wind;
  /** The wind of the round being played. */
  roundWind: Wind;
  /** The winner's seat, which is also their flower number. */
  seatIndex: Seat;
  flowers: BonusKey[];
  selfDraw: boolean;
}

const WIND_KEY: Record<Wind, TileKey> = {
  east: 'wE',
  south: 'wS',
  west: 'wW',
  north: 'wN',
};

const DRAGON_KEYS: TileKey[] = ['rR', 'rG', 'rW'];

function isDragon(key: TileKey): boolean {
  return (DRAGON_KEYS as string[]).includes(key);
}

function isWind(key: TileKey): boolean {
  return key[0] === 'w';
}

function add(picks: HandPattern[], id: string, count = 1): void {
  const existing = picks.find((pick) => pick.id === id);
  if (existing) existing.count += count;
  else picks.push({ id, count });
}

/** Flowers and seasons, which score whatever the hand turns out to be. */
function addBonuses(picks: HandPattern[], context: HandContext): void {
  if (context.flowers.length === 0) {
    add(picks, 'no_flowers');
    return;
  }
  // A flower is your own when its number matches your seat: East is 1.
  const own = context.flowers.filter(
    (key) => Number(key.slice(1)) === context.seatIndex + 1,
  ).length;
  if (own > 0) add(picks, 'own_flower', own);
}

function addSelfDraw(picks: HandPattern[], context: HandContext): void {
  if (context.selfDraw) add(picks, 'self_drawn');
}

/**
 * The patterns a finished hand holds, read off one way of splitting it.
 *
 * The order of the checks is the scoring itself: a hand that is Small Three
 * Dragons is five faan and its two dragon pungs do not also count, which is
 * how this table plays it.
 */
export function patternsOf(
  reading: Reading,
  context: HandContext,
): HandPattern[] {
  const picks: HandPattern[] = [];
  const groups: TileSet[] = [...reading.sets, reading.pair];
  const triplets = reading.sets.filter((set) => set.kind !== 'chow');

  const suits = new Set(
    groups
      .map((set) => set.key)
      .filter(isSuitKey)
      .map((key) => key[0]),
  );
  const hasHonour = groups.some((set) => !isSuitKey(set.key));

  if (suits.size === 0) add(picks, 'all_honors');
  else if (suits.size === 1 && !hasHonour) add(picks, 'full_flush');
  else if (suits.size === 1 && hasHonour) add(picks, 'mixed_one_suit');

  if (triplets.length === 4) add(picks, 'all_triplets');
  if (triplets.length === 0) add(picks, 'all_sequences');

  const dragonTriplets = triplets.filter((set) => isDragon(set.key));
  const dragonPair = isDragon(reading.pair.key);
  if (dragonTriplets.length === 3) add(picks, 'big_three_dragons');
  else if (dragonTriplets.length === 2 && dragonPair) {
    // Five faan flat; the two pungs inside it do not score again.
    add(picks, 'small_three_dragons');
  } else if (dragonTriplets.length > 0) {
    add(picks, 'dragon_triplet', dragonTriplets.length);
  }

  const windTriplets = triplets.filter((set) => isWind(set.key));
  const windPair = isWind(reading.pair.key);
  if (windTriplets.length === 4) add(picks, 'big_four_winds');
  else if (windTriplets.length === 3 && windPair)
    add(picks, 'small_four_winds');
  else {
    const seat = WIND_KEY[context.seatWind];
    const round = WIND_KEY[context.roundWind];
    if (windTriplets.some((set) => set.key === seat)) add(picks, 'seat_wind');
    if (windTriplets.some((set) => set.key === round)) add(picks, 'round_wind');
  }

  addSelfDraw(picks, context);
  addBonuses(picks, context);
  return picks;
}

/** Thirteen orphans has no sets at all, so it is read straight off the tiles. */
export function orphanPatterns(context: HandContext): HandPattern[] {
  const picks: HandPattern[] = [{ id: 'thirteen_orphans', count: 1 }];
  addSelfDraw(picks, context);
  addBonuses(picks, context);
  return picks;
}

/**
 * What a part finished hand already shows.
 *
 * Only the patterns that cannot be taken away by a later tile: a third dragon
 * is a pung whatever else arrives, and a hand that is all one suit stays that
 * way unless another suit is added. Flowers are left out, because a hand with
 * none so far may still pick one up.
 */
export function patternsSoFar(
  tiles: readonly TileKey[],
  context: HandContext,
): HandPattern[] {
  const picks: HandPattern[] = [];
  const counts = countTiles(tiles);
  const suits = new Set(tiles.filter(isSuitKey).map((key) => key[0]));
  const hasHonour = tiles.some((key) => !isSuitKey(key));

  if (tiles.length >= 6 && suits.size === 1) {
    add(picks, hasHonour ? 'mixed_one_suit' : 'full_flush');
  }

  const dragons = DRAGON_KEYS.filter((key) => (counts[key] ?? 0) >= 3).length;
  if (dragons > 0) add(picks, 'dragon_triplet', dragons);

  if ((counts[WIND_KEY[context.seatWind]] ?? 0) >= 3) add(picks, 'seat_wind');
  if ((counts[WIND_KEY[context.roundWind]] ?? 0) >= 3) add(picks, 'round_wind');

  addSelfDraw(picks, context);
  return picks;
}

export interface ScoredHand {
  /** Null when the hand is thirteen orphans, which has no sets. */
  reading: Reading | null;
  patterns: HandPattern[];
  total: BuilderTotal;
  /** True once the tiles make a winning hand. */
  complete: boolean;
}

/**
 * The best this hand can be read as.
 *
 * A hand that splits more than one way is worth whatever its best split is
 * worth, so every reading is scored and the highest kept. The tiles never
 * move: this only decides how to describe them.
 */
export function scoreHand(
  tiles: readonly TileKey[],
  context: HandContext,
  rules: Rules,
): ScoredHand {
  if (isThirteenOrphans(tiles)) {
    const patterns = orphanPatterns(context);
    return {
      reading: null,
      patterns,
      total: totalFor(patterns, rules),
      complete: true,
    };
  }

  let best: ScoredHand | null = null;
  for (const reading of splitHand(tiles)) {
    const patterns = patternsOf(reading, context);
    const total = totalFor(patterns, rules);
    const better =
      !best ||
      (total.isLimit && !best.total.isLimit) ||
      (total.isLimit === best.total.isLimit && total.raw > best.total.raw);
    if (better) best = { reading, patterns, total, complete: true };
  }
  if (best) return best;

  const patterns = patternsSoFar(tiles, context);
  return {
    reading: null,
    patterns,
    total: totalFor(patterns, rules),
    complete: false,
  };
}
