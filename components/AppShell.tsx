'use client';

import { useEffect } from 'react';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation, type View } from '@/lib/game/navigation';
import { GameScreen } from '@/components/table/GameScreen';
import { StatsScreen } from '@/components/stats/StatsScreen';
import { GamesScreen } from '@/components/games/GamesScreen';
import { HomeScreen } from '@/components/home/HomeScreen';
import { StorageError } from '@/components/ui/StorageError';
import { TileSprite } from '@/components/ui/TileSprite';
import { SettleScreen } from '@/components/settle/SettleScreen';
import { GlossaryScreen } from '@/components/glossary/GlossaryScreen';
import { ScoreHandScreen } from '@/components/scorer/ScoreHandScreen';

/**
 * The whole app behind one route. Views are swapped in place so nothing needs
 * the network once the app has loaded, which is what makes it usable at a table
 * with no signal.
 */
export function AppShell() {
  const { games, loading, storageError } = useGames();
  const { view, gameId, go } = useNavigation();

  // A link to a game that is not here any more — deleted, or opened on
  // another device — lands on home rather than on an empty table.
  useEffect(() => {
    if (storageError || loading) return;
    const needsGame: View[] = ['table', 'stats'];
    if (!needsGame.includes(view)) return;
    if (gameId && games.some((game) => game.id === gameId)) return;
    go('home', null);
  }, [loading, storageError, view, gameId, games, go]);

  // A storage failure is reported, never silently shown as an empty app.
  if (storageError) return <StorageError error={storageError} />;

  if (loading) {
    return (
      <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </p>
    );
  }

  return (
    <>
      <TileSprite />
      <Body />
    </>
  );
}

/** The view itself, so the sprite is mounted once above whatever is showing. */
function Body() {
  const { games } = useGames();
  const { view, gameId } = useNavigation();

  if (view === 'home') return <HomeScreen />;
  if (view === 'games') return <GamesScreen />;
  if (view === 'settle') return <SettleScreen />;
  if (view === 'glossary') return <GlossaryScreen />;
  if (view === 'score') return <ScoreHandScreen />;

  const activeId = gameId ?? games[0]?.id;
  if (!activeId) return <HomeScreen />;

  if (view === 'stats') return <StatsScreen gameId={activeId} />;
  return <GameScreen gameId={activeId} />;
}
