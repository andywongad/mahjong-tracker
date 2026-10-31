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
  showSections = true,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  /**
   * Whether the section row rides in the header.
   *
   * Home turns it off and places it in the page instead, under the two
   * things people came to do. In a sticky header it would sit above them,
   * which puts the least-used controls first on the screen people see most.
   */
  showSections?: boolean;
}) {
  const { view, go } = useNavigation();

  const atHome = view === 'home';

  return (
    <AppHeader
      wide={wide}
      // The felt is the table, so it is worn by the one screen where you are
      // sitting at one. Everything else is something you read.
      tone={view === 'table' ? 'felt' : 'page'}
      title={title}
      subtitle={subtitle}
      right={
        <>
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
          <HeaderButton
            onClick={() => openSheet('settings')}
            label="Settings"
            hint="Light or dark, and the language the app speaks"
            hintAlign="end"
          >
            <SettingsIcon />
          </HeaderButton>
        </>
      }
      nav={showSections ? <SectionNav /> : undefined}
    />
  );
}


/**
 * History, Rules and Stats.
 *
 * In the header on every screen but home, and in the page on home, so the
 * order on the screen matches what people reach for.
 */
export function SectionNav() {
  const { games } = useGames();
  const { view, gameId, go } = useNavigation();

  const current = useMemo(() => {
    const summaries = summarise(games);
    const named = gameId && summaries.find((game) => game.id === gameId);
    return named || resumable(summaries) || summaries[0] || null;
  }, [games, gameId]);

  return (
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
