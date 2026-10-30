import { describe, expect, it } from 'vitest';
import { validateReading, isSolvable } from '../validate';
import type { TileKey } from '@/lib/tiles';

const tile = (code: string, confidence: 'high' | 'low' = 'high') => ({
  code,
  confidence,
});

/** A real hand: four sets and a pair. */
const COMPLETE = [
  'd1', 'd1', 'd1',
  'd2', 'd3', 'd4',
  'b5', 'b6', 'b7',
  'c9', 'c9', 'c9',
  'wE', 'wE',
];

describe('what the model sent back', () => {
  it('takes a complete hand, keeping the photo order', () => {
    const result = validateReading({
      tiles: COMPLETE.map((c) => tile(c)),
      flowers: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Not sorted: the player reads along the row in front of them.
    expect(result.reading.tiles).toEqual(COMPLETE);
  });

  it('refuses a code that is not a tile', () => {
    const result = validateReading({
      tiles: [...COMPLETE.map((c) => tile(c)).slice(1), tile('d10')],
      flowers: [],
    });
    expect(result).toEqual({ ok: false, error: 'unknown-tile-code' });
  });

  it('refuses a fifth copy of a tile', () => {
    const five = ['d1', 'd1', 'd1', 'd1', 'd1', 'd2', 'd3', 'd4', 'b5', 'b6', 'b7', 'c9', 'c9', 'c9'];
    const result = validateReading({
      tiles: five.map((c) => tile(c)),
      flowers: [],
    });
    expect(result).toEqual({ ok: false, error: 'too-many-copies' });
  });

  it('refuses a hand with too few tiles', () => {
    const result = validateReading({
      tiles: COMPLETE.slice(0, 12).map((c) => tile(c)),
      flowers: [],
    });
    expect(result).toEqual({ ok: false, error: 'too-few-tiles' });
  });

  it('refuses a hand with more tiles than kongs could explain', () => {
    const result = validateReading({
      tiles: [...COMPLETE, ...COMPLETE].map((c) => tile(c)),
      flowers: [],
    });
    expect(result).toEqual({ ok: false, error: 'too-many-tiles' });
  });

  it('refuses a flower listed among the tiles', () => {
    const result = validateReading({
      tiles: [tile('f1'), ...COMPLETE.map((c) => tile(c))],
      flowers: [],
    });
    expect(result).toEqual({ ok: false, error: 'flower-in-tiles' });
  });

  it('refuses a tile listed among the flowers', () => {
    const result = validateReading({
      tiles: COMPLETE.map((c) => tile(c)),
      flowers: [tile('d1')],
    });
    expect(result).toEqual({ ok: false, error: 'tile-in-flowers' });
  });

  it('refuses the same flower twice, because a set holds one of each', () => {
    const result = validateReading({
      tiles: COMPLETE.map((c) => tile(c)),
      flowers: [tile('f1'), tile('f1')],
    });
    expect(result).toEqual({ ok: false, error: 'duplicate-flower' });
  });

  it('refuses something that is not a reading at all', () => {
    expect(validateReading(null).ok).toBe(false);
    expect(validateReading('nope').ok).toBe(false);
    expect(validateReading({ flowers: [] }).ok).toBe(false);
  });

  it('reports which tiles were guesses, by position', () => {
    const tiles = COMPLETE.map((c, i) => tile(c, i === 2 || i === 11 ? 'low' : 'high'));
    const result = validateReading({ tiles, flowers: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.lowConfidence).toEqual([2, 11]);
  });

  it('keeps a note but not an essay', () => {
    const result = validateReading({
      tiles: COMPLETE.map((c) => tile(c)),
      flowers: [],
      notes: `  ${'glare '.repeat(200)}`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.notes!.length).toBeLessThanOrEqual(300);
  });
});

describe('whether the tiles make a hand', () => {
  it('reads four sets and a pair', () => {
    expect(isSolvable(COMPLETE as TileKey[])).toBe(true);
  });

  it('knows thirteen orphans, which has no sets at all', () => {
    const orphans = [
      'd1', 'd9', 'b1', 'b9', 'c1', 'c9',
      'wE', 'wS', 'wW', 'wN', 'rR', 'rG', 'rW', 'rW',
    ];
    expect(isSolvable(orphans as TileKey[])).toBe(true);
  });

  it('rejects fourteen real tiles that do not split', () => {
    const noSplit = [
      'd1', 'd2', 'd4', 'd6', 'd8', 'b1', 'b3', 'b5', 'b7', 'b9', 'c2', 'c4', 'c6', 'c8',
    ];
    expect(isSolvable(noSplit as TileKey[])).toBe(false);
  });
});
