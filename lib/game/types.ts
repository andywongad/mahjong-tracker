import type { Rules } from '@/lib/rules/types';
import type { Hand, PlayerNames } from '@/lib/scoring';

/** A hand as stored: the rules data plus identity and ordering. */
export type HandRecord = Hand & { id: string; seq: number };

export interface GameRecord {
  id: string;
  /** Calendar date of the game, as yyyy-mm-dd. */
  date: string;
  players: PlayerNames;
  /** A snapshot of the house rules, not a reference to a saved rule set, so
   *  editing a rule set later never rewrites a finished game. */
  rules: Rules;
  /** Which saved rule set this came from, for display only. */
  ruleSetId?: string;
  ruleSetName?: string;
  /**
   * When the scorekeeper called the game, if they ended it before the North
   * round finished. Not derived: only they know the night stopped early.
   */
  endedAt?: string;
  /** Slug for the read only share link at /g/[slug]. */
  shareSlug: string;
  hands: HandRecord[];
  createdAt: string;
  updatedAt: string;
  /** True while local changes are waiting to reach the server. */
  pendingSync?: boolean;
}

export interface NewGameInput {
  date: string;
  players: PlayerNames;
  rules: Rules;
  ruleSetId?: string;
  ruleSetName?: string;
}

/**
 * Storage behind the UI. The local IndexedDB implementation backs the app
 * today; a Supabase implementation can satisfy the same interface later without
 * the screens changing.
 */
export interface GameStore {
  listGames(): Promise<GameRecord[]>;
  getGame(id: string): Promise<GameRecord | null>;
  getGameBySlug(slug: string): Promise<GameRecord | null>;
  createGame(input: NewGameInput): Promise<GameRecord>;
  updateGame(
    id: string,
    patch: Partial<
      Pick<
        GameRecord,
        'date' | 'players' | 'rules' | 'ruleSetId' | 'ruleSetName' | 'endedAt'
      >
    >,
  ): Promise<GameRecord>;
  deleteGame(id: string): Promise<void>;
  addHand(gameId: string, hand: Hand): Promise<GameRecord>;
  updateHand(gameId: string, handId: string, hand: Hand): Promise<GameRecord>;
  deleteHand(gameId: string, handId: string): Promise<GameRecord>;
}
