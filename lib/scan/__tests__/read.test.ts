import { describe, expect, it, vi } from 'vitest';
import { readHand, type Reader } from '../read';
import { scanConfig } from '../config';

const CONFIG = scanConfig({
  SCAN_MODEL: 'primary-model',
  SCAN_FALLBACK_MODEL: 'fallback-model',
});

const entry = (code: string) => ({ code, confidence: 'high' });

const COMPLETE = [
  'd1', 'd1', 'd1', 'd2', 'd3', 'd4',
  'b5', 'b6', 'b7', 'c9', 'c9', 'c9', 'wE', 'wE',
];
/** Fourteen real tiles that do not split into four sets and a pair. */
const UNSOLVABLE = [
  'd1', 'd2', 'd4', 'd6', 'd8', 'b1', 'b3', 'b5', 'b7', 'b9', 'c2', 'c4', 'c6', 'c8',
];

const reading = (codes: string[]) => ({
  tiles: codes.map(entry),
  flowers: [],
});

/** A reader that answers each call from the queue, counting tokens. */
function queued(...answers: unknown[]): Reader {
  const queue = [...answers];
  return vi.fn(async () => ({
    raw: queue.shift() ?? null,
    inputTokens: 1000,
    outputTokens: 100,
  }));
}

describe('reading a hand, with one fallback', () => {
  it('stops at the first model when the hand is good', async () => {
    const reader = queued(reading(COMPLETE));
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(reader).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe('ok');
    expect(result.usedFallback).toBe(false);
    expect(result.modelUsed).toBe('primary-model');
    expect(result.solvable).toBe(true);
  });

  it('falls back when the first answer is not JSON at all', async () => {
    const reader = queued(null, reading(COMPLETE));
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(reader).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(true);
    expect(result.modelUsed).toBe('fallback-model');
    expect(result.outcome).toBe('ok');
  });

  it('falls back when the first answer breaks the rules of a tile set', async () => {
    const reader = queued(
      reading(['d1', 'd1', 'd1', 'd1', 'd1', 'd2', 'd3', 'd4', 'b5', 'b6', 'b7', 'c9', 'c9', 'c9']),
      reading(COMPLETE),
    );
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(reader).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe('ok');
    expect(result.usedFallback).toBe(true);
  });

  it('falls back on a lawful hand the solver cannot split', async () => {
    const reader = queued(reading(UNSOLVABLE), reading(COMPLETE));
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(reader).toHaveBeenCalledTimes(2);
    expect(result.solvable).toBe(true);
    expect(result.modelUsed).toBe('fallback-model');
  });

  it('counts both attempts as one scan', async () => {
    const reader = queued(null, reading(COMPLETE));
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(result.inputTokens).toBe(2000);
    expect(result.outputTokens).toBe(200);
  });

  it('never tries a third time', async () => {
    const reader = queued(null, null);
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(reader).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe('invalid');
    expect(result.reading).toBeNull();
  });

  it('keeps an unsolvable but lawful reading rather than nothing', async () => {
    // The photo may simply have been taken a tile early. The player is about
    // to check it, and the scorer already says it does not make a hand.
    const reader = queued(reading(UNSOLVABLE), null);
    const result = await readHand('img', 'image/jpeg', CONFIG, reader);

    expect(result.outcome).toBe('ok');
    expect(result.solvable).toBe(false);
    expect(result.reading?.tiles).toEqual(UNSOLVABLE);
  });

  it('asks the first model at the configured effort', async () => {
    const reader = queued(reading(COMPLETE));
    await readHand('img', 'image/jpeg', CONFIG, reader);
    expect(reader).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'primary-model', effort: 'low' }),
    );
  });
});
