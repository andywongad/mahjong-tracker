'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './client';
import { fetchSharedGame, type SharedGame } from './sharedGame';

/** How often to check when the socket is not telling us anything. */
const POLL_MS = 20_000;

export interface SharedGameState {
  game: SharedGame | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  /** True once the broadcast channel is connected. */
  live: boolean;
  refresh: () => void;
}

/**
 * Keep a shared game current.
 *
 * Two independent paths, because neither is trustworthy alone. The database
 * broadcasts on a public topic when a hand changes, which is fast; and the page
 * polls, which survives a dropped socket, a sleeping phone, or a tab that was
 * in the background for an hour.
 *
 * The broadcast is only ever a nudge. Its payload is not read into the page, so
 * a spoofed message on the public topic costs a wasted request and nothing
 * more. Everything on screen came from the share functions.
 */
export function useSharedGame(slug: string): SharedGameState {
  const [game, setGame] = useState<SharedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  // Held in a ref so polling can skip fetching hands without re-subscribing.
  const updatedAt = useRef<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async (force = false) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const { game: next, unchanged } = await fetchSharedGame(
          slug,
          force ? null : updatedAt.current,
        );
        if (unchanged) return;
        if (!next) {
          setNotFound(true);
          return;
        }
        updatedAt.current = next.updatedAt;
        setGame(next);
        setNotFound(false);
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Could not load this game.',
        );
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [slug],
  );

  // Fetch on arrival. The rule cannot see that load is async: every setState
  // inside it happens after an await, so none run synchronously here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(true);
  }, [load]);

  // The nudge.
  useEffect(() => {
    const client = supabase();
    if (!client) return;

    const channel = client
      .channel(`game:${slug}`)
      .on('broadcast', { event: 'changed' }, () => {
        // Deliberately ignores the payload and asks the server itself.
        void load();
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));

    return () => {
      setLive(false);
      void client.removeChannel(channel);
    };
  }, [slug, load]);

  // The fallback, for when the socket is not there.
  useEffect(() => {
    const timer = setInterval(() => void load(), POLL_MS);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return {
    game,
    loading,
    notFound,
    error,
    live,
    refresh: () => void load(true),
  };
}
