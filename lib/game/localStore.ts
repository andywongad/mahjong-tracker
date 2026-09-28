'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { OUR_TABLE } from '@/lib/rules/types';
import type { Hand } from '@/lib/scoring';
import { newId, newShareSlug } from './ids';
import { buildSeedGame } from './seed';
import type { GameRecord, GameStore, HandRecord, NewGameInput } from './types';

interface MahjongDB extends DBSchema {
  games: {
    key: string;
    value: GameRecord;
    indexes: { byDate: string; bySlug: string };
  };
  /** Changes waiting to reach the server, oldest first. */
  outbox: {
    key: number;
    value: OutboxEntry;
    indexes: { byGame: string };
  };
}

/** Shapes seen before v2, only used while migrating. */
type LegacyHand = Omit<HandRecord, 'faan'> & { points?: number; faan?: number };
type LegacyGame = Omit<GameRecord, 'hands'> & {
  zaaWuPenalty?: number;
  hands: LegacyHand[];
};

export interface OutboxEntry {
  id?: number;
  gameId: string;
  kind: 'game:upsert' | 'game:delete';
  at: string;
}

const DB_NAME = 'mahjong-tracker';
/** v2 moved games onto a rules object and renamed a hand's points to faan. */
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<MahjongDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<MahjongDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const games = database.createObjectStore('games', { keyPath: 'id' });
          games.createIndex('byDate', 'date');
          games.createIndex('bySlug', 'shareSlug', { unique: true });

          const outbox = database.createObjectStore('outbox', {
            keyPath: 'id',
            autoIncrement: true,
          });
          outbox.createIndex('byGame', 'gameId');
        }

        if (oldVersion < 2) {
          // Every game played before house rules existed was played on the
          // group's own table, so that preset reproduces its scores exactly.
          // Its old standalone penalty is carried into the rules object.
          const store = transaction.objectStore('games');
          void store.openCursor().then(function migrate(cursor): unknown {
            if (!cursor) return undefined;
            const game = cursor.value as LegacyGame;
            if (!game.rules) {
              game.rules = {
                ...OUR_TABLE,
                zaaWuPenalty: game.zaaWuPenalty ?? OUR_TABLE.zaaWuPenalty,
              };
              game.ruleSetName = 'Our table';
              delete game.zaaWuPenalty;
            }
            const hands = game.hands as LegacyHand[];
            game.hands = hands.map((hand) => {
              if (hand.points === undefined) return hand as HandRecord;
              const { points, ...rest } = hand;
              return { ...rest, faan: points } as HandRecord;
            });
            void cursor.update(game as unknown as GameRecord);
            return cursor.continue().then(migrate);
          });
        }
      },
    });
  }
  return dbPromise;
}

function now(): string {
  return new Date().toISOString();
}

/** Newest game first, breaking ties on when it was created. */
function byRecency(a: GameRecord, b: GameRecord): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

/** Renumber hands so seq always matches position after an insert or delete. */
function resequence(hands: GameRecord['hands']): GameRecord['hands'] {
  return hands.map((hand, index) => ({ ...hand, seq: index }));
}

async function put(game: GameRecord): Promise<GameRecord> {
  const saved: GameRecord = { ...game, updatedAt: now(), pendingSync: true };
  const database = await db();
  const tx = database.transaction(['games', 'outbox'], 'readwrite');
  await tx.objectStore('games').put(saved);
  await tx.objectStore('outbox').add({ gameId: saved.id, kind: 'game:upsert', at: now() });
  await tx.done;
  return saved;
}

async function load(id: string): Promise<GameRecord> {
  const game = await (await db()).get('games', id);
  if (!game) throw new Error(`No game with id ${id}`);
  return game;
}

export const localStore: GameStore = {
  async listGames() {
    const games = await (await db()).getAll('games');
    return games.sort(byRecency);
  },

  async getGame(id) {
    return (await (await db()).get('games', id)) ?? null;
  },

  async getGameBySlug(slug) {
    return (await (await db()).getFromIndex('games', 'bySlug', slug)) ?? null;
  },

  async createGame(input: NewGameInput) {
    const timestamp = now();
    const game: GameRecord = {
      id: newId(),
      date: input.date,
      players: input.players,
      rules: input.rules,
      ruleSetId: input.ruleSetId,
      ruleSetName: input.ruleSetName,
      shareSlug: newShareSlug(),
      hands: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return put(game);
  },

  async updateGame(id, patch) {
    const game = await load(id);
    return put({ ...game, ...patch });
  },

  async deleteGame(id) {
    const database = await db();
    const tx = database.transaction(['games', 'outbox'], 'readwrite');
    await tx.objectStore('games').delete(id);
    await tx.objectStore('outbox').add({ gameId: id, kind: 'game:delete', at: now() });
    await tx.done;
  },

  async addHand(gameId, hand: Hand) {
    const game = await load(gameId);
    const record = { ...hand, id: newId(), seq: game.hands.length };
    return put({ ...game, hands: [...game.hands, record] });
  },

  async updateHand(gameId, handId, hand: Hand) {
    const game = await load(gameId);
    const hands = game.hands.map((existing) =>
      existing.id === handId ? { ...hand, id: existing.id, seq: existing.seq } : existing,
    );
    return put({ ...game, hands });
  },

  async deleteHand(gameId, handId) {
    const game = await load(gameId);
    const hands = resequence(game.hands.filter((existing) => existing.id !== handId));
    return put({ ...game, hands });
  },
};

/** Entries waiting to sync, for the offline indicator. */
export async function pendingCount(): Promise<number> {
  return (await db()).count('outbox');
}

/** Drop outbox entries once they have reached the server. */
export async function clearOutbox(upToId?: number): Promise<void> {
  const database = await db();
  if (upToId === undefined) {
    await database.clear('outbox');
    return;
  }
  const tx = database.transaction('outbox', 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (cursor.key <= upToId) await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/** Mark a game as settled once the server has it. */
export async function markSynced(gameId: string): Promise<void> {
  const database = await db();
  const game = await database.get('games', gameId);
  if (!game) return;
  await database.put('games', { ...game, pendingSync: false });
}

/**
 * Put the reference game in place on first run, exactly once.
 *
 * Both halves matter. The check and the insert share one readwrite transaction,
 * which IndexedDB serialises, so two callers cannot both find the store empty.
 * The promise is cached at module level so React's development double render
 * does not start a second attempt at all.
 */
let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const database = await db();
      const tx = database.transaction('games', 'readwrite');
      const store = tx.objectStore('games');
      if ((await store.count()) === 0) await store.put(buildSeedGame());
      await tx.done;
    })();
  }
  return seeding;
}


