'use client';

/**
 * The top of every screen inside the app.
 *
 * Home and Settings on the right on every screen, because they are about the
 * app. A game adds two things of its own: Rules beside Settings, since Rules
 * is to a game what Settings is to the app, and a row of tabs for the two
 * ways of looking at that game.
 *
 * Screens with no game in them — the glossary, how it works, the standalone
 * scorer, history — carry neither. They are a header and their content, and
 * a row of game controls above them would be pointing at a game that is not
 * on screen.
 *
 * AppHeader stays presentational and knows none of this, because the shared
 * game view at /g/[slug] renders it from outside the games provider.
 */
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { openSheet } from '@/lib/ui/sheets';
import { AppHeader, HeaderButton } from './AppHeader';
import { GameTabs } from './GameTabs';
import { HomeIcon, RulesIcon, SettingsIcon } from './HeaderIcons';

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

  const atHome = view === 'home';
  // The game views. Everything else has no game to act on.
  const onGame = view === 'table' || view === 'stats';
  // The table falls back to the newest game when the route names none, the
  // same way the view itself does, so the tabs point where the screen does.
  const shownGame = onGame ? (gameId ?? games[0]?.id ?? null) : null;

  return (
    <AppHeader
      wide={wide}
      tone={view === 'table' ? 'felt' : 'page'}
      title={title}
      subtitle={subtitle}
      right={
        <>
          {shownGame && (
            <HeaderButton
              onClick={() => openSheet('rules')}
              label="Rules"
              hint="What this table counts and what it pays, changeable mid game"
            >
              <RulesIcon />
            </HeaderButton>
          )}
          {/* Not on home itself. A control that goes where you already are
            is a button that does nothing, and it crowds the ones that do. */}
          {!atHome && (
            <HeaderButton
              onClick={() => go('home', null)}
              label="Home"
              hint="Back to the start"
            >
              <HomeIcon />
            </HeaderButton>
          )}
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
      nav={shownGame ? <GameTabs gameId={shownGame} /> : undefined}
    />
  );
}
