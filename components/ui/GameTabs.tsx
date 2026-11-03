'use client';

/**
 * The table, its numbers, and every game before it.
 *
 * The first two are one game looked at two ways. History is a wider thing —
 * all your games, not this one — and it sits here because the row is where
 * somebody at a table looks when they want to leave it, not because it is a
 * third view of the same game. It is also why the row is shown on History
 * itself: a tab that takes you somewhere the tabs disappear is not a tab.
 *
 * Deliberately not role="tab". That role is for switching panels in place,
 * which is what the scorer does; these change route, and the right thing to
 * say about a control that navigates is aria-current. Using the role here
 * would promise a tabpanel that does not exist and would muddle the meaning
 * the scorer's tabs already carry.
 */
import { useNavigation } from '@/lib/game/navigation';
import { HistoryIcon, StatsIcon, TableIcon } from './HeaderIcons';
import { HintAnchor, useHint } from './Hint';

export function GameTabs({ gameId }: { gameId: string }) {
  const { view, go } = useNavigation();

  return (
    <>
      <GameTab
        current={view === 'table'}
        onClick={() => go('table', gameId)}
        hint="The seats, the scores and the hands as they are recorded"
        icon={<TableIcon />}
      >
        Table
      </GameTab>
      <GameTab
        current={view === 'stats'}
        onClick={() => go('stats', gameId)}
        hint="Who beat whom, the running score, and the biggest swings"
        icon={<StatsIcon />}
      >
        Stats
      </GameTab>
      <GameTab
        current={view === 'games'}
        onClick={() => go('games', null)}
        hint="Every game you have played, with its final scores"
        icon={<HistoryIcon />}
      >
        History
      </GameTab>
    </>
  );
}

function GameTab({
  current,
  onClick,
  hint,
  icon,
  children,
}: {
  current: boolean;
  onClick: () => void;
  hint: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { anchorProps, targetProps, bubble } = useHint(hint);

  return (
    <HintAnchor {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        aria-current={current ? 'page' : undefined}
        {...targetProps}
        className="inline-flex items-center gap-1.5 px-1 pb-2 text-sm font-semibold"
        style={{
          color: current ? 'var(--ink)' : 'var(--muted)',
          // Sits directly on the hairline under the row, so the marked tab
          // reads as joined to the screen below it.
          borderBottom: `2px solid ${current ? 'var(--selected)' : 'transparent'}`,
          marginBottom: -1,
        }}
      >
        {icon}
        {children}
      </button>
      {bubble}
    </HintAnchor>
  );
}
