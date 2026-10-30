import { describe, expect, it } from 'vitest';
import { compareHand, summarise, type ScanRow } from '../accuracy';

const HAND = ['d1', 'd1', 'd1', 'd2', 'd3', 'd4', 'b5', 'b6', 'b7', 'c9', 'c9', 'c9', 'wE', 'wE'];

describe('comparing a scan with what was saved', () => {
  it('calls an identical hand exact', () => {
    const result = compareHand(HAND, HAND);
    expect(result.exact).toBe(true);
    expect(result.correct).toBe(14);
    expect(result.confusions).toEqual([]);
  });

  it('ignores order, because a corrected tile lands at the end of the row', () => {
    const reordered = [...HAND.slice(3), ...HAND.slice(0, 3)];
    expect(compareHand(HAND, reordered).exact).toBe(true);
  });

  it('finds the one tile that was misread, and what it should have been', () => {
    const scanned = HAND.map((t) => (t === 'b5' ? 'b6' : t));
    const result = compareHand(scanned, HAND);

    expect(result.exact).toBe(false);
    expect(result.correct).toBe(13);
    expect(result.confusions).toEqual([{ scanned: 'b6', actual: 'b5' }]);
  });

  it('counts a missing tile without inventing a confusion for it', () => {
    const result = compareHand(HAND.slice(0, 13), HAND);
    expect(result.exact).toBe(false);
    expect(result.correct).toBe(13);
    expect(result.total).toBe(14);
    expect(result.confusions).toEqual([]);
  });

  it('does not call a shorter hand exact just because every tile matched', () => {
    expect(compareHand(HAND.slice(0, 13), HAND).exact).toBe(false);
  });
});

const row = (over: Partial<ScanRow> = {}): ScanRow => ({
  created_at: '2026-10-29T12:00:00Z',
  device_id: 'device-a',
  used_fallback: false,
  est_cost_usd: 0.0004,
  outcome: 'ok',
  scanned_tiles: { tiles: HAND },
  confirmed_tiles: { tiles: HAND },
  ...over,
});

describe('the totals the admin page shows', () => {
  it('counts scans, devices and what they cost', () => {
    const totals = summarise([row(), row({ device_id: 'device-b' }), row()]);
    expect(totals.scans).toBe(3);
    expect(totals.devices).toBe(2);
    expect(totals.costUsd).toBeCloseTo(0.0012, 6);
  });

  it('counts only saved hands as confirmed', () => {
    const totals = summarise([row(), row({ confirmed_tiles: null })]);
    expect(totals.confirmed).toBe(1);
    expect(totals.scans).toBe(2);
  });

  it('separates whole-hand accuracy from per-tile accuracy', () => {
    const oneWrong = HAND.map((t) => (t === 'b5' ? 'b6' : t));
    const totals = summarise([row(), row({ scanned_tiles: { tiles: oneWrong } })]);

    // One hand perfect, one hand a tile out: half the hands, but 27 of 28 tiles.
    expect(totals.exactHands).toBe(1);
    expect(totals.confirmed).toBe(2);
    expect(totals.tilesCorrect).toBe(27);
    expect(totals.tilesTotal).toBe(28);
  });

  it('ranks the tiles that get confused most', () => {
    const b5asb6 = HAND.map((t) => (t === 'b5' ? 'b6' : t));
    const d2asd3 = HAND.map((t) => (t === 'd2' ? 'd3' : t));
    const totals = summarise([
      row({ scanned_tiles: { tiles: b5asb6 } }),
      row({ scanned_tiles: { tiles: b5asb6 } }),
      row({ scanned_tiles: { tiles: d2asd3 } }),
    ]);

    expect(totals.confusions[0]).toEqual({ scanned: 'b6', actual: 'b5', count: 2 });
    expect(totals.confusions[1]).toEqual({ scanned: 'd3', actual: 'd2', count: 1 });
  });

  it('counts how often the fallback model was needed', () => {
    const totals = summarise([row({ used_fallback: true }), row(), row()]);
    expect(totals.fallbacks).toBe(1);
  });

  it('groups by day, newest first', () => {
    const totals = summarise([
      row({ created_at: '2026-10-28T23:00:00Z' }),
      row({ created_at: '2026-10-29T01:00:00Z' }),
      row({ created_at: '2026-10-29T22:00:00Z' }),
    ]);
    expect(totals.byDay).toEqual([
      { day: '2026-10-29', scans: 2 },
      { day: '2026-10-28', scans: 1 },
    ]);
  });

  it('keeps a tally of how scans ended', () => {
    const totals = summarise([row(), row({ outcome: 'invalid' }), row({ outcome: 'capped' })]);
    expect(totals.outcomes).toEqual({ ok: 1, invalid: 1, capped: 1 });
  });
});
