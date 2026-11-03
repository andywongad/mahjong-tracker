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
import { useMemo, useState, useSyncExternalStore } from 'react';
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
import { AccountSheet } from '@/components/sheets/AccountSheet';
import { RulesSheet } from '@/components/sheets/RulesSheet';
import { GameMenuSheet } from '@/components/sheets/GameMenuSheet';
import { GameSheet } from '@/components/sheets/GameSheet';
import { openSheet } from '@/lib/ui/sheets';

export function GlobalSheets() {
  const open = useSyncExternalStore(
    subscribeSheet,
    openSheetSnapshot,
    openSheetOnServer,
  );
  const { games, updateGame, deleteGame } = useGames();
  const { gameId, go } = useNavigation();
  // Editing is opened from the menu rather than from the header, so it is
  // held here with the sheets it sits among.
  const [editing, setEditing] = useState(false);

  const game = useMemo(() => {
    const named = gameId && games.find((item) => item.id === gameId);
    if (named) return named;
    // Matches what the Rules button acts on: the live game, else the newest.
    const summaries = summarise(games);
    const current = resumable(summaries) || summaries[0];
    return current ? (games.find((item) => item.id === current.id) ?? null) : null;
  }, [games, gameId]);

  const result = useMemo(() => (game ? replay(game) : null), [game]);
  const handCount = result?.handCount ?? 0;
  // The same test the link under the table used: hands have been played, the
  // rounds have not run out, and nobody has called it yet.
  const canEndEarly = Boolean(
    result && handCount > 0 && !result.isComplete && !game?.endedAt,
  );

  return (
    <>
      <SettingsSheet open={open === 'settings'} onClose={closeSheet} />
      <AccountSheet open={open === 'account'} onClose={closeSheet} />
      {game && (
        <GameMenuSheet
          open={open === 'game-menu'}
          date={game.date}
          handCount={handCount}
          canEndEarly={canEndEarly}
          onClose={closeSheet}
          onRules={() => openSheet('rules')}
          onEdit={() => setEditing(true)}
          onEndEarly={() =>
            void updateGame(game.id, { endedAt: new Date().toISOString() })
          }
          onDelete={async () => {
            // Closed first. The game resolver falls back to the next game
            // when this one goes, so a sheet left open would reappear over
            // home describing a game nobody asked about — with its backdrop
            // over the offer to undo.
            closeSheet();
            await deleteGame(game.id);
            // The screen about the game has to go with the game. Home
            // carries the offer to put it back.
            go('home', null);
          }}
        />
      )}

      {game && editing && (
        <GameSheet
          open
          editing={game}
          onClose={() => setEditing(false)}
          onSave={async (input) => {
            await updateGame(game.id, input);
          }}
        />
      )}

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
