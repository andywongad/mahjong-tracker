import { countTiles, isSuitKey, orderOf, type TileKey } from './index';

/**
 * Splitting a hand into the sets it is made of.
 *
 * Pure, and deliberately knows nothing about faan: it answers "what shapes are
 * in these tiles", and scoring those shapes is somebody else's job. A hand can
 * often be read more than one way, so this returns every reading and lets the
 * scorer keep the best one.
 */

export type SetKind = 'chow' | 'pung' | 'kong' | 'pair';

export interface TileSet {
  kind: SetKind;
  /** For a run, the lowest tile of the three. */
  key: TileKey;
}

export interface Reading {
  /** The four sets, kongs first. */
  sets: TileSet[];
  pair: TileSet;
}

/** The tiles a set is made of, in order. */
export function tilesOfSet(set: TileSet): TileKey[] {
  if (set.kind === 'chow') {
    const suit = set.key[0];
    const low = Number(set.key.slice(1));
    return [
      `${suit}${low}`,
      `${suit}${low + 1}`,
      `${suit}${low + 2}`,
    ] as TileKey[];
  }
  const size = { pung: 3, kong: 4, pair: 2 }[set.kind];
  return Array.from({ length: size }, () => set.key);
}

/**
 * Every way these tiles split into four sets and a pair.
 *
 * Kongs are chosen first, as a subset of the tiles held four times, because a
 * kong is the one set that changes how many tiles a complete hand needs. For
 * each choice the rest is solved by taking the lowest tile still unused and
 * trying it as a pung and as the start of a run.
 */
export function splitHand(tiles: readonly TileKey[]): Reading[] {
  const counts = countTiles(tiles);
  const keys = (Object.keys(counts) as TileKey[]).sort(
    (a, b) => orderOf(a) - orderOf(b),
  );
  const quads = keys.filter((key) => counts[key] === 4);
  const readings: Reading[] = [];

  const solve = (
    left: Record<string, number>,
    sets: TileSet[],
    found: TileSet[][],
  ): void => {
    const key = keys.find((candidate) => left[candidate] > 0);
    if (!key) {
      found.push([...sets]);
      return;
    }

    if (left[key] >= 3) {
      left[key] -= 3;
      sets.push({ kind: 'pung', key });
      solve(left, sets, found);
      sets.pop();
      left[key] += 3;
    }

    if (isSuitKey(key)) {
      const suit = key[0];
      const low = Number(key.slice(1));
      const second = `${suit}${low + 1}` as TileKey;
      const third = `${suit}${low + 2}` as TileKey;
      if (low <= 7 && left[second] > 0 && left[third] > 0) {
        left[key] -= 1;
        left[second] -= 1;
        left[third] -= 1;
        sets.push({ kind: 'chow', key });
        solve(left, sets, found);
        sets.pop();
        left[key] += 1;
        left[second] += 1;
        left[third] += 1;
      }
    }
  };

  for (let mask = 0; mask < 1 << quads.length; mask += 1) {
    const base = { ...counts };
    const kongs: TileSet[] = [];
    quads.forEach((key, index) => {
      if (mask & (1 << index)) {
        base[key] -= 4;
        kongs.push({ kind: 'kong', key });
      }
    });

    // Four sets and a pair: every kong held adds a tile to what a hand needs.
    if (tiles.length - 4 * kongs.length !== 3 * (4 - kongs.length) + 2)
      continue;

    for (const pairKey of keys) {
      if (base[pairKey] < 2) continue;
      const left = { ...base };
      left[pairKey] -= 2;
      const found: TileSet[][] = [];
      solve(left, [], found);
      for (const sets of found) {
        if (sets.length + kongs.length !== 4) continue;
        readings.push({
          sets: [...kongs, ...sets],
          pair: { kind: 'pair', key: pairKey },
        });
      }
    }
  }

  return readings;
}

/** The thirteen terminals and honours, which is the one hand with no sets. */
export const ORPHAN_KEYS: TileKey[] = [
  'd1',
  'd9',
  'b1',
  'b9',
  'c1',
  'c9',
  'wE',
  'wS',
  'wW',
  'wN',
  'rR',
  'rG',
  'rW',
];

export function isThirteenOrphans(tiles: readonly TileKey[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = countTiles(tiles);
  return (
    ORPHAN_KEYS.every((key) => counts[key] >= 1) &&
    Object.keys(counts).every((key) => (ORPHAN_KEYS as string[]).includes(key))
  );
}

/** How many tiles a hand of this shape needs: fourteen, plus one per kong. */
export function targetSize(tiles: readonly TileKey[]): number {
  const counts = countTiles(tiles);
  const quads = Object.values(counts).filter((count) => count === 4).length;
  return 14 + quads;
}
