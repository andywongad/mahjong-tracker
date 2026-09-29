import {
  AUG_19_2026_DATE,
  AUG_19_2026_HANDS,
  AUG_19_2026_PLAYERS,
  AUG_19_2026_RULES,
} from '@/lib/scoring/fixtures/aug-19-2026';
import { newId } from './ids';
import type { GameRecord } from './types';

/**
 * A fixed id and slug, so seeding is idempotent: a second attempt replaces the
 * same record rather than adding another copy of the game.
 */
export const SEED_GAME_ID = 'seed-aug-19-2026';
export const SEED_SHARE_SLUG = 'aug19-2026';

/**
 * The group's real game of Aug 19 2026, as a stored record. Seeded on first run
 * so there is a game to look at, and used as the database seed later.
 */
export function buildSeedGame(): GameRecord {
  const timestamp = new Date(`${AUG_19_2026_DATE}T20:00:00.000Z`).toISOString();
  return {
    id: SEED_GAME_ID,
    date: AUG_19_2026_DATE,
    players: AUG_19_2026_PLAYERS,
    rules: AUG_19_2026_RULES,
    ruleSetName: 'Everyone pays',
    shareSlug: SEED_SHARE_SLUG,
    hands: AUG_19_2026_HANDS.map((hand, index) => ({
      ...hand,
      id: newId(),
      seq: index,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
    pendingSync: false,
  };
}
