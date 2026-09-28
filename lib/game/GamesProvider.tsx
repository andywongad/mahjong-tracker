'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Hand } from '@/lib/scoring';
import { ensureSeeded, localStore, pendingCount } from './localStore';
import type { GameRecord, NewGameInput } from './types';

interface GamesContextValue {
  games: GameRecord[];
  loading: boolean;
  /** Entries waiting to reach the server. */
  pending: number;
  online: boolean;
  createGame: (input: NewGameInput) => Promise<GameRecord>;
  updateGame: (
    id: string,
    patch: Partial<
      Pick<
        GameRecord,
        'date' | 'players' | 'rules' | 'ruleSetId' | 'ruleSetName' | 'endedAt'
      >
    >,
  ) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  addHand: (gameId: string, hand: Hand) => Promise<void>;
  updateHand: (gameId: string, handId: string, hand: Hand) => Promise<void>;
  deleteHand: (gameId: string, handId: string) => Promise<void>;
}

const GamesContext = createContext<GamesContextValue | null>(null);

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    const [list, count] = await Promise.all([localStore.listGames(), pendingCount()]);
    setGames(list);
    setPending(count);
  }, []);

  // First run seeds the reference game so the app is never empty on arrival.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSeeded();
        if (!cancelled) await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const value = useMemo<GamesContextValue>(
    () => ({
      games,
      loading,
      pending,
      online,
      async createGame(input) {
        const game = await localStore.createGame(input);
        await refresh();
        return game;
      },
      async updateGame(id, patch) {
        await localStore.updateGame(id, patch);
        await refresh();
      },
      async deleteGame(id) {
        await localStore.deleteGame(id);
        await refresh();
      },
      async addHand(gameId, hand) {
        await localStore.addHand(gameId, hand);
        await refresh();
      },
      async updateHand(gameId, handId, hand) {
        await localStore.updateHand(gameId, handId, hand);
        await refresh();
      },
      async deleteHand(gameId, handId) {
        await localStore.deleteHand(gameId, handId);
        await refresh();
      },
    }),
    [games, loading, pending, online, refresh],
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

export function useGames(): GamesContextValue {
  const context = useContext(GamesContext);
  if (!context) throw new Error('useGames must be used inside GamesProvider');
  return context;
}

/** One game by id, with the list state alongside. */
export function useGame(id: string | undefined) {
  const context = useGames();
  const game = useMemo(
    () => (id ? context.games.find((candidate) => candidate.id === id) ?? null : null),
    [context.games, id],
  );
  return { ...context, game };
}
