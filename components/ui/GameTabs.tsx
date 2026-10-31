'use client';

/**
 * The views of one game: the table, and its numbers.
 *
 * Tabs rather than buttons, because that is what they are — the same game
 * looked at two ways, with the one you are on marked. They sit under the
 * title, attached to the screen they belong to.
 *
 * Deliberately not role="tab". That role is for switching panels in place,
 * which is what the scorer does; these change route, and the right thing to
 * say about a control that navigates is aria-current. Using the role here
 * would promise a tabpanel that does not exist and would muddle the meaning
 * the scorer's tabs already carry.
 */
import { useNavigation } from '@/lib/game/navigation';
import { StatsIcon, TableIcon } from './HeaderIcons';
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
