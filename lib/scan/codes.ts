/**
 * The vocabulary the model is allowed to answer in.
 *
 * These are not a separate set of codes: they are the app's own TileKey and
 * BonusKey values. The scorer, the stored hands and the model all speak the
 * same strings, so a scan needs no translation step to become a hand, and a
 * tile added to the game is added here by construction rather than by someone
 * remembering to update a second list.
 */
import {
  BONUS_KEYS,
  HONOUR_KEYS,
  RANKS,
  SUIT_KEYS,
  isBonusKey,
  isHonourKey,
  isSuitKey,
  type BonusKey,
  type TileKey,
} from '@/lib/tiles';

/** Every tile that can be in the hand itself. */
export const TILE_CODES: TileKey[] = [
  ...SUIT_KEYS.flatMap((suit) =>
    RANKS.map((rank) => `${suit}${rank}` as TileKey),
  ),
  ...HONOUR_KEYS,
];

/** Flowers and seasons, which sit beside the hand rather than in it. */
export const BONUS_CODES: BonusKey[] = [...BONUS_KEYS];

export type Confidence = 'high' | 'low';

export interface ScannedTile {
  code: TileKey;
  confidence: Confidence;
}

export interface ScannedBonus {
  code: BonusKey;
  confidence: Confidence;
}

export interface ScanReading {
  tiles: ScannedTile[];
  flowers: ScannedBonus[];
  notes?: string;
}

export const isTileCode = (code: string): code is TileKey =>
  isSuitKey(code) || isHonourKey(code);

export const isBonusCode = (code: string): code is BonusKey => isBonusKey(code);

/**
 * The schema the API is asked to answer in.
 *
 * Built from the lists above, so the enum the model is held to is the same
 * vocabulary the app uses. Structured outputs guarantee the shape; they say
 * nothing about whether the tiles make sense together, which is what
 * validate.ts is for.
 */
export function readingSchema(): Record<string, unknown> {
  const entry = (codes: readonly string[]) => ({
    type: 'object',
    additionalProperties: false,
    required: ['code', 'confidence'],
    properties: {
      code: { type: 'string', enum: [...codes] },
      confidence: {
        type: 'string',
        enum: ['high', 'low'],
        description:
          'low when the tile is blurred, angled, overlapped or otherwise a guess',
      },
    },
  });

  return {
    type: 'object',
    additionalProperties: false,
    required: ['tiles', 'flowers'],
    properties: {
      tiles: {
        type: 'array',
        description:
          'The tiles of the hand itself, left to right as they appear in the photo',
        items: entry(TILE_CODES),
      },
      flowers: {
        type: 'array',
        description: 'Flowers and seasons set aside from the hand',
        items: entry(BONUS_CODES),
      },
      notes: {
        type: 'string',
        description:
          'At most one short sentence, only when something about the photo made the reading hard',
      },
    },
  };
}
