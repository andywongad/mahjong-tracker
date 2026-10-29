import { describe, expect, it } from 'vitest';
import {
  isThirteenOrphans,
  splitHand,
  targetSize,
  tilesOfSet,
  type Reading,
} from '../solver';
import type { TileKey } from '..';

/** A reading as a sorted list of shapes, so two readings can be compared. */
function shapes(reading: Reading): string[] {
  return [...reading.sets, reading.pair]
    .map((set) => `${set.kind}:${set.key}`)
    .sort();
}

describe('splitting a hand into sets', () => {
  it('reads the prototype’s example hand', () => {
    // 2-2-2 characters, 4-5-6, 6-7-8, 9-9 pair, and three green dragons.
    const tiles: TileKey[] = [
      'rG',
      'c9',
      'c4',
      'rG',
      'c2',
      'c6',
      'c5',
      'c2',
      'c7',
      'rG',
      'c6',
      'c2',
      'c8',
      'c9',
    ];
    const readings = splitHand(tiles);
    expect(readings.length).toBeGreaterThan(0);

    const found = readings.map(shapes);
    expect(found).toContainEqual(
      ['chow:c4', 'chow:c6', 'pair:c9', 'pung:c2', 'pung:rG'].sort(),
    );
  });

  it('finds both ways a hand can be read when there are two', () => {
    // 1-1-1 2-2-2 3-3-3 of dots is three pungs, or three 1-2-3 runs.
    const tiles: TileKey[] = [
      'd1',
      'd1',
      'd1',
      'd2',
      'd2',
      'd2',
      'd3',
      'd3',
      'd3',
      'b1',
      'b2',
      'b3',
      'c5',
      'c5',
    ];
    const found = splitHand(tiles).map(shapes);

    expect(found).toContainEqual(
      ['chow:b1', 'pair:c5', 'pung:d1', 'pung:d2', 'pung:d3'].sort(),
    );
    expect(found).toContainEqual(
      ['chow:b1', 'chow:d1', 'chow:d1', 'chow:d1', 'pair:c5'].sort(),
    );
  });

  it('reads a kong, which makes a hand of fifteen tiles', () => {
    const tiles: TileKey[] = [
      'd5',
      'd5',
      'd5',
      'd5',
      'b1',
      'b2',
      'b3',
      'c7',
      'c8',
      'c9',
      'wE',
      'wE',
      'wE',
      'rR',
      'rR',
    ];
    expect(tiles).toHaveLength(15);
    expect(targetSize(tiles)).toBe(15);

    const readings = splitHand(tiles);
    expect(readings).toHaveLength(1);
    expect(shapes(readings[0])).toEqual(
      ['chow:b1', 'chow:c7', 'kong:d5', 'pair:rR', 'pung:wE'].sort(),
    );
  });

  it('knows thirteen orphans, which is the hand with no sets at all', () => {
    const tiles: TileKey[] = [
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
      'rW',
    ];
    expect(isThirteenOrphans(tiles)).toBe(true);
    // It is not four sets and a pair, so the splitter finds nothing.
    expect(splitHand(tiles)).toEqual([]);
  });

  it('refuses fourteen tiles that are not a hand', () => {
    const tiles: TileKey[] = [
      'd1',
      'd2',
      'd4',
      'd5',
      'd7',
      'd8',
      'b1',
      'b2',
      'b4',
      'b5',
      'b7',
      'b8',
      'c1',
      'c3',
    ];
    expect(splitHand(tiles)).toEqual([]);
    expect(isThirteenOrphans(tiles)).toBe(false);
  });

  it('refuses a hand that is one tile short', () => {
    const tiles: TileKey[] = [
      'd1',
      'd2',
      'd3',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
      'd9',
      'b1',
      'b2',
      'b3',
      'c5',
    ];
    expect(splitHand(tiles)).toEqual([]);
  });

  it('lists the tiles a set is made of', () => {
    expect(tilesOfSet({ kind: 'chow', key: 'd4' })).toEqual(['d4', 'd5', 'd6']);
    expect(tilesOfSet({ kind: 'pung', key: 'rR' })).toEqual(['rR', 'rR', 'rR']);
    expect(tilesOfSet({ kind: 'kong', key: 'wN' })).toHaveLength(4);
    expect(tilesOfSet({ kind: 'pair', key: 'c9' })).toEqual(['c9', 'c9']);
  });

  it('asks for one more tile for every kong held', () => {
    expect(targetSize(['d1', 'd2', 'd3'] as TileKey[])).toBe(14);
    expect(
      targetSize(['d5', 'd5', 'd5', 'd5', 'b1', 'b1', 'b1', 'b1'] as TileKey[]),
    ).toBe(16);
  });
});
