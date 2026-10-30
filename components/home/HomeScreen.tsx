'use client';

/**
 * Where the app opens.
 *
 * Two things the app does, and three things you can read. They are not laid
 * out as five equal tiles on purpose: a row of identical buttons tells a
 * newcomer nothing about where to start. Starting a game and scoring a hand
 * are the actions, so they are large and first; the reference material is
 * quieter and sits under them.
 *
 * A game in progress is the exception to all of that. It goes above
 * everything, carrying the scores as they stand, because someone opening the
 * app at the table is almost always coming back to it.
 */
import { useMemo, useState } from 'react';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { summarise } from '@/lib/game/standings';
import { playedGames, resumable } from '@/lib/game/resume';
import { formatGameDate } from '@/lib/game/format';
import { AppHeader } from '@/components/ui/AppHeader';
import { GameSheet } from '@/components/sheets/GameSheet';
import { AboutSheet } from '@/components/sheets/AboutSheet';
import { SettingsSheet } from '@/components/sheets/SettingsSheet';
import { formatSigned } from '@/components/ui/Score';

export function HomeScreen() {
  const { games, loading, createGame } = useGames();
  const { go } = useNavigation();
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const summaries = useMemo(() => summarise(games), [games]);

  // Which game to carry on with, and whether this person has played any, are
  // both decided in lib/game/resume.ts, where the two awkward cases — the
  // seeded sample, and a complete round that is still being played — are
  // spelled out and tested.
  const inProgress = useMemo(() => resumable(summaries), [summaries]);
  const hasGames = summaries.length > 0;
  const isNewcomer = useMemo(
    () => playedGames(summaries).length === 0,
    [summaries],
  );

  return (
    <>
      <AppHeader
        title="Mahjong tracker"
        subtitle="Hong Kong scoring, kept at the table"
        actions={
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="touch inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
            style={{
              background: 'var(--felt-soft)',
              color: 'var(--ink-on-felt)',
            }}
          >
            <GearIcon />
            Settings
          </button>
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="page-column pad-safe-bottom flex flex-col gap-6 px-4 py-4"
      >
        {loading && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading&hellip;
          </p>
        )}

        {!loading && inProgress && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Current game</h2>
            <button
              type="button"
              onClick={() => go('table', inProgress.id)}
              className="tile-pressable touch flex w-full flex-col gap-2 rounded-xl px-4 py-3 text-left"
              style={{
                background: 'var(--tile-back)',
                color: '#fff',
                boxShadow: '0 3px 0 #0e4a38',
              }}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold">
                  {formatGameDate(inProgress.date)}
                </span>
                <span className="tnum text-xs opacity-80">
                  {inProgress.isComplete
                    ? 'Round finished'
                    : `Hand ${inProgress.handCount + 1}`}
                </span>
              </span>
              {/* Two by two rather than a wrapping row: four names of
                unequal length left one stranded on a line of its own. */}
              <span className="grid grid-cols-2 gap-x-4 gap-y-1">
                {inProgress.players.map((player, seat) => (
                  <span
                    key={seat}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="truncate opacity-80">{player}</span>
                    <span className="tnum shrink-0 font-semibold">
                      {formatSigned(inProgress.scores[seat] ?? 0)}
                    </span>
                  </span>
                ))}
              </span>
            </button>
          </section>
        )}

        {!loading && isNewcomer && (
          // One short paragraph, read once in a person's life. Anything longer
          // is a manual nobody asked for; How this works is there for whoever
          // wants it.
          <p className="text-sm" style={{ color: 'var(--ink)' }}>
            Keep score for a Hong Kong mahjong table. Tap whoever won, and the
            payments, the dealer and the round look after themselves. Nothing
            to sign up for, and it works with no signal.
            {hasGames && (
              <>
                {' '}
                There is a finished game in{' '}
                <button
                  type="button"
                  onClick={() => go('games', null)}
                  className="underline underline-offset-2"
                  style={{ color: 'var(--accent)' }}
                >
                  History
                </button>{' '}
                to look around.
              </>
            )}
          </p>
        )}

        {/* No heading over these two. "Current game" earns one because it
          names a specific game; a heading here would only be a word for "the
          buttons", and the buttons already say what they are. */}
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setNewGameOpen(true)}
            className="tile-pressable touch w-full rounded-xl py-4 text-base font-semibold"
            style={
              inProgress
                ? {
                    background: 'var(--tile-face)',
                    border: '1px solid var(--line-strong)',
                  }
                : {
                    background: 'var(--tile-back)',
                    color: '#fff',
                    boxShadow: '0 3px 0 #0e4a38',
                  }
            }
          >
            Start a game
          </button>

          {/* The other thing the app does, for a table playing for fun: what
            is this hand worth, with no game and no score kept. */}
          <button
            type="button"
            onClick={() => go('score', null)}
            className="tile-sm tile-pressable touch w-full rounded-xl py-3.5 text-sm font-semibold"
          >
            Score a hand
          </button>
        </section>

        {/* Three things you read rather than use. Quieter, and together. */}
        <nav aria-label="Reference" className="grid grid-cols-3 gap-2">
          <SmallButton onClick={() => go('games', null)} disabled={!hasGames}>
            History
          </SmallButton>
          <SmallButton onClick={() => go('glossary', null)}>
            Glossary
          </SmallButton>
          <SmallButton onClick={() => setAboutOpen(true)}>
            How this works
          </SmallButton>
        </nav>

        {hasGames && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Games are kept on this device. Send the tally to the group when you
            are done.
          </p>
        )}
      </main>

      <GameSheet
        open={newGameOpen}
        editing={null}
        // The last game's table is nearly always this game's table, so the
        // names and the house rules come forward rather than being retyped.
        lastPlayers={games[0]?.players}
        lastRules={games[0]?.rules}
        lastRuleSetName={games[0]?.ruleSetName}
        onClose={() => setNewGameOpen(false)}
        onSave={async (draft) => {
          const game = await createGame(draft);
          setNewGameOpen(false);
          go('table', game.id);
        }}
      />
      <AboutSheet
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onOpenGlossary={() => {
          setAboutOpen(false);
          go('glossary', null);
        }}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

/**
 * A quiet button for the reading material.
 *
 * History is disabled rather than hidden before there is any: a button that
 * appears once you have played is a layout that moves under you, and a dead
 * end is clearer than a surprise.
 */
function SmallButton({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tile-sm tile-pressable touch rounded-xl px-1 py-3 text-xs font-semibold"
      style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
    >
      {children}
    </button>
  );
}

function GearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
