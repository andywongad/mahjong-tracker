'use client';

/**
 * The top of every screen inside the app.
 *
 * Settings on the right on every screen, because it is about the app. A game
 * adds a menu of its own holding everything you can do to the game rather
 * than in it — its rules, its players, ending it, deleting it — and a row of
 * tabs for the ways of looking at it.
 *
 * Rules moved into that menu rather than sitting beside it: at 390px a third
 * icon button cost the four player names, and Rules is a setting of this
 * game, which is what the rest of the menu is too.
 *
 * Getting home is the name block on the left, not a button on the right. One
 * fewer control in a bar that never had room, and the two at the right are
 * now both about this screen rather than one of each.
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
import { AccountIcon, MoreIcon, SettingsIcon } from './HeaderIcons';

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
  // A game is on screen, so there is a set of rules to act on.
  const onGame = view === 'table' || view === 'stats';
  // History joins the two game views in the tab row, so the row shows there
  // too: a tab that takes you where the tabs vanish is not a tab. It is not
  // a game view though, which is why Rules is kept to onGame — on History
  // there is no one game for it to be about.
  const withTabs = onGame || view === 'games';
  // The table falls back to the newest game when the route names none, the
  // same way the view itself does, so the tabs point where the screen does.
  const shownGame = withTabs ? (gameId ?? games[0]?.id ?? null) : null;

  return (
    <AppHeader
      wide={wide}
      tone={view === 'table' ? 'felt' : 'page'}
      title={title}
      subtitle={subtitle}
      // The name block is the way home now, so there is no Home button. On
      // home it is the page's heading instead of a link to itself.
      onHome={atHome ? undefined : () => go('home', null)}
      right={
        <>
          {onGame && shownGame && (
            <HeaderButton
              onClick={() => openSheet('game-menu')}
              label="This game"
              hint="Its rules, its players, and ending or deleting it"
            >
              <MoreIcon />
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
