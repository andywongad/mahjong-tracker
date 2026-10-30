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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HintAnchor, useHint } from '@/components/ui/Hint';
import { GameSheet } from '@/components/sheets/GameSheet';
import { AboutSheet } from '@/components/sheets/AboutSheet';
import { formatSigned } from '@/components/ui/Score';

export function HomeScreen() {
  const { games, loading, createGame } = useGames();
  const { go } = useNavigation();
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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
      <ScreenHeader
        title="Mahjong tracker"
        subtitle="Hong Kong scoring, kept at the table"
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
          <ActionButton
            onClick={() => setNewGameOpen(true)}
            hint="Name the four players, pick the house rules, and sit down"
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
          </ActionButton>

          {/* The other thing the app does, for a table playing for fun: what
            is this hand worth, with no game and no score kept. */}
          <ActionButton
            onClick={() => go('score', null)}
            hint="Tap the tiles in and be told what the hand is worth, with no game and no score kept"
            className="tile-sm tile-pressable touch w-full rounded-xl py-3.5 text-sm font-semibold"
          >
            Score a hand
          </ActionButton>
        </section>

        {/* Three things you read rather than use. Quieter, and together. */}
        <nav aria-label="Reference" className="grid grid-cols-3 gap-2">
          <SmallButton
            onClick={() => go('games', null)}
            disabled={!hasGames}
            hint={
              hasGames
                ? 'Every game you have played, with its final scores'
                : 'Nothing here yet. Games you play will be listed here.'
            }
          >
            History
          </SmallButton>
          <SmallButton
            onClick={() => go('glossary', null)}
            hint="Every term the app uses, in characters and in English"
          >
            Glossary
          </SmallButton>
          <SmallButton
            onClick={() => setAboutOpen(true)}
            hint="A short tour of recording a hand, the rules and sharing the tally"
            hintAlign="end"
          >
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
    </>
  );
}

/** One of the two things the app does, with a line on what that means. */
function ActionButton({
  onClick,
  hint,
  className,
  style,
  children,
}: {
  onClick: () => void;
  hint: string;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { anchorProps, targetProps, bubble } = useHint(hint);
  return (
    <HintAnchor className="w-full" {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        {...targetProps}
        className={className}
        style={style}
      >
        {children}
      </button>
      {bubble}
    </HintAnchor>
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
  hint,
  hintAlign,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  hint: string;
  hintAlign?: 'center' | 'end';
  children: React.ReactNode;
}) {
  // The hint works disabled as well as enabled, which is the state that most
  // needs it: a dead control with no reason given is just a dead end.
  const { anchorProps, targetProps, bubble } = useHint(hint, hintAlign);
  return (
    <HintAnchor className="w-full" {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        {...targetProps}
        className="tile-sm tile-pressable touch w-full rounded-xl px-1 py-3 text-xs font-semibold"
        style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
      >
        {children}
      </button>
      {bubble}
    </HintAnchor>
  );
}
