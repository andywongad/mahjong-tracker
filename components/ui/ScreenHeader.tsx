'use client';

/**
 * The top of every screen inside the app.
 *
 * Home and Settings on the right on every screen, because they are about the
 * app. A game adds two things of its own: Rules, which is to a game what
 * Settings is to the app and so sits next to it, and a row of tabs for the
 * two ways of looking at that game. Home leads, furthest from the thumb,
 * because leaving is not one of the things the screen does.
 *
 * Screens with no game in them — the glossary, how it works, the standalone
 * scorer, history — carry neither. They are a header and their content, and
 * a row of game controls above them would be pointing at a game that is not
 * on screen.
 *
 * AppHeader stays presentational and knows none of this, because the shared
 * game view at /g/[slug] renders it from outside the games provider.
 */
import { useSyncExternalStore } from 'react';
import {
  accountsAvailable,
  getAccount,
  getAccountOnServer,
  subscribeAccount,
} from '@/lib/auth/session';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { openSheet } from '@/lib/ui/sheets';
import { AppHeader, HeaderButton } from './AppHeader';
import { GameTabs } from './GameTabs';
import { AccountIcon, HomeIcon, RulesIcon, SettingsIcon } from './HeaderIcons';

/**
 * Signing in, next to settings on home.
 *
 * On home rather than on every screen: it is read once when somebody decides
 * to have an account, and then almost never. The rest of the time it would be
 * a third control crowding the two that are used.
 *
 * It says which it is. "Sign in" when nobody is, "Account" when somebody is,
 * so the same button never means two things without saying so.
 */
function AccountButton() {
  const account = useSyncExternalStore(
    subscribeAccount,
    getAccount,
    getAccountOnServer,
  );

  if (!accountsAvailable()) return null;

  return (
    <HeaderButton
      onClick={() => openSheet('account')}
      label={account ? 'Account' : 'Sign in'}
      hint={
        account
          ? `Signed in as ${account.email}`
          : 'Optional. Keeps your games on every device you use'
      }
    >
      <AccountIcon />
    </HeaderButton>
  );
}

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
          {/* Leftmost, and so the furthest from the thumb: the way out, not
            one of the things this screen does. Not on home itself — a
            control that goes where you already are is a button that does
            nothing, and it crowds the ones that do. */}
          {!atHome && (
            <HeaderButton
              onClick={() => go('home', null)}
              label="Home"
              hint="Back to the start"
            >
              <HomeIcon />
            </HeaderButton>
          )}
          {shownGame && (
            <HeaderButton
              onClick={() => openSheet('rules')}
              label="Rules"
              hint="What this table counts and what it pays, changeable mid game"
            >
              <RulesIcon />
            </HeaderButton>
          )}
          {atHome && <AccountButton />}
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
