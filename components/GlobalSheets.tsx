'use client';

/**
 * The sheets that can be opened from the top of any screen.
 *
 * Settings and the house rules are reachable everywhere now, so neither can
 * live inside the screen that happens to be showing. They are mounted once,
 * above the view, and opened through lib/ui/sheets.
 *
 * Rules edits the current game: the one the route names, or the one still
 * being played. The button that opens it is disabled when there is no game,
 * so by the time this renders one there is something to edit.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { resumable } from '@/lib/game/resume';
import { summarise } from '@/lib/game/standings';
import { replay } from '@/lib/scoring';
import {
  closeSheet,
  openSheetOnServer,
  openSheetSnapshot,
  subscribeSheet,
} from '@/lib/ui/sheets';
import { SettingsSheet } from '@/components/sheets/SettingsSheet';
import { RulesSheet } from '@/components/sheets/RulesSheet';

export function GlobalSheets() {
  const open = useSyncExternalStore(
    subscribeSheet,
    openSheetSnapshot,
    openSheetOnServer,
  );
  const { games, updateGame } = useGames();
  const { gameId } = useNavigation();

  const game = useMemo(() => {
    const named = gameId && games.find((item) => item.id === gameId);
    if (named) return named;
    // Matches what the Rules button acts on: the live game, else the newest.
    const summaries = summarise(games);
    const current = resumable(summaries) || summaries[0];
    return current ? (games.find((item) => item.id === current.id) ?? null) : null;
  }, [games, gameId]);

  const handCount = useMemo(
    () => (game ? replay(game).handCount : 0),
    [game],
  );

  return (
    <>
      <SettingsSheet open={open === 'settings'} onClose={closeSheet} />
      {game && (
        <RulesSheet
          // Keyed on the game and its last change, so the fields start from
          // what is actually stored every time it opens.
          key={open === 'rules' ? `rules-${game.id}-${game.updatedAt}` : 'closed'}
          open={open === 'rules'}
          rules={game.rules}
          ruleSetName={game.ruleSetName}
          handCount={handCount}
          onClose={closeSheet}
          onApply={async (rules, set) => {
            await updateGame(game.id, {
              rules,
              ruleSetId: set?.id,
              ruleSetName: set?.name,
            });
          }}
        />
      )}
    </>
  );
}
