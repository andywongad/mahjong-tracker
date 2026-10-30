/**
 * Whether what came back could be a hand.
 *
 * Structured outputs guarantee the shape and the vocabulary: every code is a
 * real tile, every confidence is high or low. They cannot say whether the
 * tiles make sense together, which is everything below.
 *
 * Two levels, and the difference matters. A reading that breaks one of these
 * rules is wrong about the world and is worth a second, better model. A
 * reading that is merely unsolvable — thirteen real tiles that happen not to
 * split into four sets and a pair — may well be a correct reading of a photo
 * taken a tile early, so it is retried once but never refused outright: the
 * player can still fix it by hand, and refusing would throw away a good scan.
 */
import { splitHand, isThirteenOrphans } from '@/lib/tiles/solver';
import type { BonusKey, TileKey } from '@/lib/tiles';
import {
  isBonusCode,
  isTileCode,
  type ScanReading,
  type Confidence,
} from './codes';

export const MIN_TILES = 13;
export const MAX_TILES = 18;
export const MAX_COPIES = 4;

export type ValidationError =
  | 'not-an-object'
  | 'unknown-tile-code'
  | 'unknown-flower-code'
  | 'flower-in-tiles'
  | 'tile-in-flowers'
  | 'too-few-tiles'
  | 'too-many-tiles'
  | 'too-many-copies'
  | 'duplicate-flower';

export interface ValidReading {
  tiles: TileKey[];
  flowers: BonusKey[];
  /** Positions in `tiles` the model was unsure of, for outlining in the UI. */
  lowConfidence: number[];
  notes?: string;
}

export type Validation =
  | { ok: true; reading: ValidReading }
  | { ok: false; error: ValidationError };

/**
 * Check a reading against the rules a set of tiles obeys.
 *
 * Written against unknown rather than the typed shape on purpose: this runs on
 * whatever the API returned, and the one thing it must not do is trust it.
 */
export function validateReading(value: unknown): Validation {
  if (typeof value !== 'object' || value === null)
    return { ok: false, error: 'not-an-object' };

  const body = value as Partial<ScanReading>;
  const rawTiles = Array.isArray(body.tiles) ? body.tiles : null;
  const rawFlowers = Array.isArray(body.flowers) ? body.flowers : [];
  if (!rawTiles) return { ok: false, error: 'not-an-object' };

  const tiles: TileKey[] = [];
  const lowConfidence: number[] = [];

  for (const entry of rawTiles) {
    const code = String((entry as { code?: unknown })?.code ?? '');
    if (isBonusCode(code)) return { ok: false, error: 'flower-in-tiles' };
    if (!isTileCode(code)) return { ok: false, error: 'unknown-tile-code' };
    if (confidenceOf(entry) === 'low') lowConfidence.push(tiles.length);
    tiles.push(code);
  }

  const flowers: BonusKey[] = [];
  for (const entry of rawFlowers) {
    const code = String((entry as { code?: unknown })?.code ?? '');
    if (isTileCode(code)) return { ok: false, error: 'tile-in-flowers' };
    if (!isBonusCode(code)) return { ok: false, error: 'unknown-flower-code' };
    // A set holds one of each flower and each season, so a repeat is a misread
    // rather than a hand.
    if (flowers.includes(code)) return { ok: false, error: 'duplicate-flower' };
    flowers.push(code);
  }

  if (tiles.length < MIN_TILES) return { ok: false, error: 'too-few-tiles' };
  if (tiles.length > MAX_TILES) return { ok: false, error: 'too-many-tiles' };

  const counts = new Map<TileKey, number>();
  for (const tile of tiles) {
    const next = (counts.get(tile) ?? 0) + 1;
    if (next > MAX_COPIES) return { ok: false, error: 'too-many-copies' };
    counts.set(tile, next);
  }

  const reading: ValidReading = { tiles, flowers, lowConfidence };
  if (typeof body.notes === 'string' && body.notes.trim())
    reading.notes = body.notes.trim().slice(0, 300);
  return { ok: true, reading };
}

/** Whether the solver can read these tiles as a finished hand. */
export function isSolvable(tiles: readonly TileKey[]): boolean {
  if (isThirteenOrphans(tiles)) return true;
  return splitHand(tiles).length > 0;
}

function confidenceOf(entry: unknown): Confidence {
  const value = (entry as { confidence?: unknown })?.confidence;
  return value === 'low' ? 'low' : 'high';
}
