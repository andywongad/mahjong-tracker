'use client';

/**
 * Running a sync at the moments that matter, and saying what it did.
 *
 * Four triggers, and no polling: signing in, coming back online, the tab
 * being looked at again, and a local change settling. A timer would spend
 * somebody's battery to discover nothing had happened.
 *
 * Nothing here runs at all without an account. Signed out, the app is exactly
 * what it was: games in IndexedDB on this device, no network, no difference.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  localStore,
  clearOutbox,
  pendingEntries,
  saveFromServer,
} from '@/lib/game/localStore';
import { supabase } from '@/lib/supabase/client';
import { syncOnce, type LocalGames } from './engine';
import { supabaseGames } from './remote';

export type SyncState =
  | { kind: 'off' }
  | { kind: 'idle'; at: string | null; pending: number }
  | { kind: 'syncing' }
  | { kind: 'failed'; pending: number };

/** A change settled locally and wants to go up. */
const CHANGED = 'mahjong:gameschanged';
export const announceLocalChange = () =>
  window.dispatchEvent(new Event(CHANGED));

/**
 * Built when a sync runs, not when this module loads.
 *
 * An object literal at module scope reads its imports the moment the file is
 * evaluated, which is too early: anything importing this transitively then
 * has to provide every one of them, and a test that partially mocks the
 * store for its own reasons breaks on a function it has never heard of.
 */
const localGames = (): LocalGames => ({
  list: () => localStore.listGames(),
  get: (id) => localStore.getGame(id),
  save: saveFromServer,
  pending: async () =>
    (await pendingEntries()).map((entry) => ({
      id: entry.id,
      gameId: entry.gameId,
      kind: entry.kind,
    })),
  clearPending: (upToId) => clearOutbox(upToId),
});

export function useSync(
  accountId: string | null,
  onChanged: () => void,
): SyncState {
  // Signed out is not a state to store, it is the absence of one: derived
  // below rather than written into state by an effect.
  const [state, setState] = useState<SyncState>({ kind: 'syncing' });
  // Held in a ref so a sync already running is never started a second time:
  // two passes at once would race each other writing the same games.
  const running = useRef(false);

  /**
   * One pass, reporting what the state should become.
   *
   * It sets nothing itself. The effect below sets state from the promise it
   * returns, which is the shape React asks for: an effect talks to an
   * external system and updates state from that system's callback, rather
   * than setting state on the way in.
   */
  const attempt = useCallback(async (): Promise<SyncState | null> => {
    const client = supabase();
    if (!accountId || !client || running.current) return null;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

    running.current = true;
    try {
      const report = await syncOnce(
        localGames(),
        supabaseGames(client, accountId),
      );
      const pending = (await pendingEntries()).length;
      // Only disturb the screen when something actually moved.
      if (report.pulled > 0 || report.merged > 0) onChanged();
      return report.failed > 0
        ? { kind: 'failed', pending }
        : { kind: 'idle', at: new Date().toISOString(), pending };
    } catch {
      return { kind: 'failed', pending: (await pendingEntries()).length };
    } finally {
      running.current = false;
    }
  }, [accountId, onChanged]);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    const go = () => {
      void attempt().then((next) => {
        if (next && !cancelled) setState(next);
      });
    };

    go();

    const onVisible = () => {
      if (document.visibilityState === 'visible') go();
    };
    window.addEventListener('online', go);
    window.addEventListener(CHANGED, go);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('online', go);
      window.removeEventListener(CHANGED, go);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [accountId, attempt]);

  return accountId ? state : { kind: 'off' };
}
