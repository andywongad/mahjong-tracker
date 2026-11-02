'use client';

/**
 * The offer to put back the game just deleted.
 *
 * One component rather than a copy per screen, because the delete it answers
 * for can be made on the list, in the game settings, or at the table itself —
 * and in that last case the screen it was made on is gone by the time the
 * offer appears.
 */

import { useGames } from '@/lib/game/GamesProvider';
import { formatGameDate } from '@/lib/game/format';
import { UndoToast } from './UndoToast';

export function DeletedGameToast() {
  const { justDeleted, restoreGame, dismissDeleted } = useGames();

  return (
    /* Pinned to the bottom edge, where a thumb already is — the same place a
      mis-recorded hand is taken back from. */
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-[36rem] flex-col gap-2">
        {justDeleted && (
          <UndoToast
            key={justDeleted.id}
            message={`Deleted ${formatGameDate(justDeleted.date)}`}
            onUndo={() => restoreGame(justDeleted)}
            onDismiss={dismissDeleted}
          />
        )}
      </div>
    </div>
  );
}
