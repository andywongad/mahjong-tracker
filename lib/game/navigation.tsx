'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

/**
 * A tiny client side router.
 *
 * The app has to work with no signal at the table, and Next's client navigation
 * fetches a payload from the server for every route change, which hangs when the
 * network is gone. Every screen here is client rendered from IndexedDB, so
 * nothing needs the server: views are swapped in place and the URL is kept in
 * step with history.pushState, which never touches the network.
 *
 * The URL is the source of truth, read through useSyncExternalStore. Back and
 * forward arrive as popstate; our own pushes announce themselves, since
 * pushState fires no event of its own.
 */
export type View = 'table' | 'stats' | 'games' | 'settle' | 'glossary';

export interface Route {
  view: View;
  gameId: string | null;
}

interface NavigationValue extends Route {
  go: (view: View, gameId?: string | null) => void;
  back: () => void;
}

const ROUTE_EVENT = 'mahjong:routechange';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(ROUTE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(ROUTE_EVENT, onChange);
  };
}

/** The raw search string, which is cheap to compare between renders. */
const getSnapshot = () => window.location.search;
const getServerSnapshot = () => '';

function parse(search: string): Route {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  const known: View[] = ['stats', 'games', 'settle', 'glossary'];
  return {
    view: known.includes(view as View) ? (view as View) : 'table',
    gameId: params.get('game'),
  };
}

function toUrl(route: Route): string {
  const params = new URLSearchParams();
  if (route.view !== 'table') params.set('view', route.view);
  if (route.gameId) params.set('game', route.gameId);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const route = useMemo(() => parse(search), [search]);

  const go = useCallback((view: View, gameId?: string | null) => {
    const current = parse(window.location.search);
    const next: Route = { view, gameId: gameId === undefined ? current.gameId : gameId };
    if (next.view === current.view && next.gameId === current.gameId) return;
    window.history.pushState(null, '', toUrl(next));
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }, []);

  const back = useCallback(() => window.history.back(), []);

  const value = useMemo<NavigationValue>(() => ({ ...route, go, back }), [route, go, back]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used inside NavigationProvider');
  return context;
}
