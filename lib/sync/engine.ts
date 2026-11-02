/**
 * One pass of bringing a device and an account into agreement.
 *
 * Written against two small interfaces rather than against Supabase and
 * IndexedDB, so the whole thing can be run in a test with neither. What it is
 * doing is delicate enough that it should not need a network and a browser to
 * find out whether it is right.
 *
 * The order matters. Local changes go up before anything comes down, so a
 * game deleted on this device is deleted on the server before the pull has a
 * chance to hand it back.
 */
import { SEED_GAME_ID } from '@/lib/game/seed';
import type { GameRecord } from '@/lib/game/types';
import { mergeGames, sameGame } from './merge';

/** The account's copy of the games. */
export interface RemoteGames {
  list(): Promise<GameRecord[]>;
  upsert(game: GameRecord): Promise<void>;
  remove(gameId: string): Promise<void>;
}

/** This device's copy, and the queue of changes it has not sent yet. */
export interface LocalGames {
  list(): Promise<GameRecord[]>;
  get(id: string): Promise<GameRecord | null>;
  save(game: GameRecord): Promise<void>;
  pending(): Promise<{ id: number; gameId: string; kind: 'game:upsert' | 'game:delete' }[]>;
  clearPending(upToId: number): Promise<void>;
}

export interface SyncReport {
  pushed: number;
  pulled: number;
  merged: number;
  failed: number;
}

/**
 * The sample game the app seeds on first run is not somebody's game.
 *
 * It is the same record on every device, so syncing it would put a copy of a
 * game nobody played into an account, and hand it back to every other device
 * that already has its own.
 *
 * Keyed on the id rather than the record, because a delete only has the id —
 * and a delete is the case that bites. The sample is never pushed, so the
 * account has nothing to delete, and its id is not a uuid, so asking anyway
 * fails every time it is tried. A failed push stays queued and stops the
 * loop, which is right for a network blip and fatal for a request that can
 * never succeed: every change behind it waits forever while the pull keeps
 * handing those games back.
 */
const isOwn = (id: string) => id !== SEED_GAME_ID;

export async function syncOnce(
  local: LocalGames,
  remote: RemoteGames,
): Promise<SyncReport> {
  const report: SyncReport = { pushed: 0, pulled: 0, merged: 0, failed: 0 };

  // 1. Everything this device has been waiting to say.
  const queued = await local.pending();
  for (const entry of queued) {
    try {
      if (entry.kind === 'game:delete') {
        if (isOwn(entry.gameId)) await remote.remove(entry.gameId);
      } else {
        const game = await local.get(entry.gameId);
        if (game && isOwn(game.id)) await remote.upsert(game);
      }
      await local.clearPending(entry.id);
      report.pushed += 1;
    } catch (cause) {
      // Said out loud, because the silence is what made the last one so hard
      // to find: one rejected row stopped the whole queue, and the only
      // symptom was games quietly coming back. Nothing else here reaches a
      // logger — this file is written against two small interfaces so it can
      // be tested without a browser — so console is the whole of it.
      console.warn(
        `[sync] push failed, queue stopped at ${entry.kind} ${entry.gameId}:`,
        cause,
      );
      // Leave it queued. A failed push is a retry, not a loss, and stopping
      // here keeps the queue in the order it was written.
      report.failed += 1;
      break;
    }
  }

  // 2. Everything the account knows.
  let theirs: GameRecord[];
  try {
    theirs = await remote.list();
  } catch {
    report.failed += 1;
    return report;
  }

  const mine = await local.list();
  const byId = new Map(mine.map((game) => [game.id, game]));

  for (const remoteGame of theirs) {
    const localGame = byId.get(remoteGame.id);
    if (!localGame) {
      await local.save(remoteGame);
      report.pulled += 1;
      continue;
    }
    if (sameGame(localGame, remoteGame)) continue;

    const merged = mergeGames(localGame, remoteGame);
    await local.save(merged);
    report.merged += 1;
    // The merge can be newer than what the account holds, so it goes back.
    if (!sameGame(merged, remoteGame)) {
      try {
        await remote.upsert(merged);
      } catch {
        report.failed += 1;
      }
    }
  }

  // 3. Games this device has that the account has never seen. On a first
  //    sign-in this is everything, which is what claims them to the account.
  const known = new Set(theirs.map((game) => game.id));
  for (const game of mine) {
    if (known.has(game.id) || !isOwn(game.id)) continue;
    try {
      await remote.upsert(game);
      report.pushed += 1;
    } catch {
      report.failed += 1;
    }
  }

  return report;
}
