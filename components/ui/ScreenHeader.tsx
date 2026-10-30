'use client';

/**
 * The top of every screen inside the app.
 *
 * Home on the left, where you are in the middle, Settings on the right, and
 * under them the three places you move between while a game is on: History,
 * Rules and Stats. The same two bars everywhere, so the controls are in the
 * same place whatever screen you are reading.
 *
 * Rules and Stats act on the current game — the one the route names, or
 * failing that the one home offers to carry on with. That is what lets them
 * sit on every screen instead of only on the table: from the glossary, Stats
 * still means the stats of the game you are playing. With no game at all they
 * are disabled and say why, which is the state a newcomer sees.
 *
 * AppHeader stays presentational and knows none of this, because the shared
 * game view at /g/[slug] renders it from outside the games provider.
 */
import { useMemo } from 'react';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { resumable } from '@/lib/game/resume';
import { summarise } from '@/lib/game/standings';
import { openSheet } from '@/lib/ui/sheets';
import { AppHeader, HeaderButton } from './AppHeader';
import { HintAnchor, useHint } from './Hint';
import {
  HistoryIcon,
  HomeIcon,
  RulesIcon,
  SettingsIcon,
  StatsIcon,
} from './HeaderIcons';

export function ScreenHeader({
  title,
  subtitle,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
}) {
  const { games } = useGames();
  const { view, gameId, go } = useNavigation();

  // The game these buttons act on, in the order anyone would expect: the one
  // on screen, else the one still being played, else the most recent of any
  // kind. The last of those deliberately includes the seeded sample, unlike
  // "carry on" on home — looking at the sample's rules and charts is what the
  // sample is for, and leaving two of three buttons dead until a first game
  // is started would be a poor way to meet a newcomer.
  const current = useMemo(() => {
    const summaries = summarise(games);
    const named = gameId && summaries.find((game) => game.id === gameId);
    return named || resumable(summaries) || summaries[0] || null;
  }, [games, gameId]);

  const atHome = view === 'home';

  return (
    <AppHeader
      wide={wide}
      // The felt is the table, so it is worn by the one screen where you are
      // sitting at one. Everything else is something you read.
      tone={view === 'table' ? 'felt' : 'page'}
      title={title}
      subtitle={subtitle}
      left={
        <HeaderButton
          onClick={() => go('home', null)}
          label="Home"
          // Already here: the control stays so the bar does not shift, and
          // says so rather than pretending it goes somewhere.
          current={atHome}
          hint={atHome ? 'You are here' : 'Back to the start'}
        >
          <HomeIcon />
        </HeaderButton>
      }
      right={
        <HeaderButton
          onClick={() => openSheet('settings')}
          label="Settings"
          hint="Light or dark, and the language the app speaks"
          hintAlign="end"
        >
          <SettingsIcon />
        </HeaderButton>
      }
      nav={
        <>
          <NavButton
            onClick={() => go('games', null)}
            label="History"
            current={view === 'games'}
            hint={
              games.length > 0
                ? 'Every game you have played, with its final scores'
                : 'Nothing here yet. Games you play will be listed here.'
            }
          >
            <HistoryIcon />
          </NavButton>
          <NavButton
            onClick={() => openSheet('rules')}
            label="Rules"
            disabled={!current}
            hint={
              current
                ? 'What this table counts and what it pays, changeable mid game'
                : 'Start a game and its house rules will be here'
            }
          >
            <RulesIcon />
          </NavButton>
          <NavButton
            onClick={() => current && go('stats', current.id)}
            label="Stats"
            current={view === 'stats'}
            disabled={!current}
            hint={
              current
                ? 'Who beat whom, the running score, and the biggest swings'
                : 'Start a game and its charts will be here'
            }
            hintAlign="end"
          >
            <StatsIcon />
          </NavButton>
        </>
      }
    />
  );
}

/** One of the three under the title. Icon and word, always both. */
function NavButton({
  onClick,
  label,
  hint,
  hintAlign,
  current = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  label: string;
  hint: string;
  hintAlign?: 'center' | 'end';
  current?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { anchorProps, targetProps, bubble } = useHint(hint, hintAlign);

  return (
    <HintAnchor className="min-w-0 flex-1" {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-current={current ? 'page' : undefined}
        {...targetProps}
        // On the page now rather than on the felt, so it wears the same tile
        // face as every other button there. The section being read is ringed
        // in the table green, the way the chosen option is in settings,
        // rather than filled in: a filled pill in a row of three reads as the
        // one to press.
        className={`tile-sm inline-flex h-9 w-full items-center justify-center gap-1.5 px-2 text-xs font-semibold ${
          disabled ? '' : 'tile-pressable'
        }`}
        style={{
          color: 'var(--ink)',
          border: current ? '2px solid var(--selected)' : undefined,
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : undefined,
        }}
      >
        {children}
        <span className="truncate">{label}</span>
      </button>
      {bubble}
    </HintAnchor>
  );
}
