'use client';

import { useEffect } from 'react';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { GameScreen } from '@/components/table/GameScreen';
import { StatsScreen } from '@/components/stats/StatsScreen';
import { GamesScreen } from '@/components/games/GamesScreen';
import { SettleScreen } from '@/components/settle/SettleScreen';
import { GlossaryScreen } from '@/components/glossary/GlossaryScreen';

/**
 * The whole app behind one route. Views are swapped in place so nothing needs
 * the network once the app has loaded, which is what makes it usable at a table
 * with no signal.
 */
export function AppShell() {
  const { games, loading } = useGames();
  const { view, gameId, go } = useNavigation();

  // With no game chosen, fall to the most recent one, or to the games list.
  useEffect(() => {
    if (loading || view === 'games' || view === 'settle' || view === 'glossary') return;
    const known = gameId && games.some((game) => game.id === gameId);
    if (known) return;
    if (games.length > 0) go('table', games[0].id);
    else go('games', null);
  }, [loading, view, gameId, games, go]);

  if (loading) {
    return (
      <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </p>
    );
  }

  if (view === 'games') return <GamesScreen />;
  if (view === 'settle') return <SettleScreen />;
  if (view === 'glossary') return <GlossaryScreen />;

  const activeId = gameId ?? games[0]?.id;
  if (!activeId) return <GamesScreen />;

  if (view === 'stats') return <StatsScreen gameId={activeId} />;
  return <GameScreen gameId={activeId} />;
}
