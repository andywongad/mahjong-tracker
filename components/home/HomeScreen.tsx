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
import { DeletedGameToast } from '@/components/ui/DeletedGameToast';
import { formatSigned } from '@/components/ui/Score';

export function HomeScreen() {
  const { games, loading, createGame } = useGames();
  const { go } = useNavigation();
  const [newGameOpen, setNewGameOpen] = useState(false);
  // Which door this open of the sheet came through. Asked here rather than
  // inside the sheet so nobody taps twice to start a game.
  const [walkthroughFirst, setWalkthroughFirst] = useState(false);

  const summaries = useMemo(() => summarise(games), [games]);

  // Which game to carry on with, and whether this person has played any, are
  // both decided in lib/game/resume.ts, where the two awkward cases — the
  // seeded sample, and a complete round that is still being played — are
  // spelled out and tested.
  const inProgress = useMemo(() => resumable(summaries), [summaries]);
  const hasGames = summaries.length > 0;
  const played = useMemo(() => playedGames(games), [games]);
  const isNewcomer = played.length === 0;

  return (
    <>
      <ScreenHeader
        // The name block on the left is this page's heading, so the middle
        // is left empty rather than saying the name a second time.
        title=""
      />

      <main
        id="main"
        tabIndex={-1}
        className="page-column pad-safe-bottom flex flex-col gap-7 px-4 py-5"
      >
        {loading && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading&hellip;
          </p>
        )}

        {!loading && inProgress && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Current game</h2>
            <button
              type="button"
              onClick={() => go('table', inProgress.id)}
              className="tile-pressable touch flex w-full flex-col gap-2 rounded-xl px-4 py-3 text-left"
              style={{
                background: 'var(--tile-back)',
                color: '#fff',
              }}
            >
              <span className="flex items-baseline justify-between gap-3">
                {/* A point up on each line. The card is read from further
                  away than the rest of this screen — it is the thing
                  somebody opens the app at the table to get back to. */}
                <span className="text-[1.0625rem] font-semibold">
                  {formatGameDate(inProgress.date)}
                </span>
                <span className="tnum text-[0.8125rem] opacity-80">
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
                    className="flex items-baseline justify-between gap-2 text-[0.8125rem]"
                  >
                    <span className="truncate opacity-80">{player}</span>
                    <span className="tnum shrink-0 font-semibold">
                      {formatSigned(inProgress.scores[seat] ?? 0)}
                    </span>
                  </span>
                ))}
              </span>
            </button>

            {/* History sits with the current game because the two are the
              same question asked twice: this night, and the ones before it.
              Deleting used to sit here too, in the open on a screen nobody
              came to in order to delete anything. It is in the game's own
              menu now. */}
            <div className="flex">
              <SmallButton
                onClick={() => go('games', null)}
                hint="Every game you have played, with its final scores"
              >
                History
              </SmallButton>
            </div>
          </section>
        )}

        {!loading && isNewcomer && (
          // One short paragraph, read once in a person's life. Anything longer
          // is a manual nobody asked for; How this works is there for whoever
          // wants it.
          // Fifteen, not sixteen. Read once in a person's life and muted,
          // so at full body size it became the largest thing on the screen
          // and outran the two buttons it is there to introduce.
          <p
            className="text-[0.9375rem] leading-relaxed"
            style={{ color: 'var(--muted)' }}
          >
            Keep score for a Hong Kong mahjong table. Tap whoever won, and the
            payments, the dealer and the round look after themselves. No
            account needed, and it works with no signal.
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

        {/* The heading earns its place here: it names one thing a person can
          do and the two buttons under it are both ways of doing it. Asked on
          the way in rather than on a screen of its own, so starting a game is
          still one tap.

          Neither is the default. A fork with a primary button is a
          recommendation, and which of these to recommend depends on who is
          holding the phone — which is the thing the question is asking. */}
        <section className="flex flex-col gap-3">
          {/* Bigger and centred than the quiet section labels elsewhere on
            this screen, because it is not a label: it is the question the two
            buttons under it answer, and the main thing the app is for. */}
          <h2 className="text-center text-xl font-bold phone:text-2xl">
            Start a game
          </h2>
          <DoorButton
            onClick={() => {
              setWalkthroughFirst(true);
              setNewGameOpen(true);
            }}
            label="I'm still learning"
            detail="We'll walk you through the scoring — four quick questions, each one in real numbers"
          />
          <DoorButton
            onClick={() => {
              setWalkthroughFirst(false);
              setNewGameOpen(true);
            }}
            label="I know what I'm doing"
            detail="Straight to the players and the house rules"
          />
        </section>

        {/* The other thing the app does, for a table playing for fun: what
          is this hand worth, with no game and no score kept. */}
        <ActionButton
          onClick={() => go('score', null)}
          hint="Tap the tiles in and be told what the hand is worth, with no game and no score kept"
          className="tile-sm tile-pressable touch w-full rounded-2xl py-4 text-base font-semibold"
        >
          Score a hand
        </ActionButton>

        {/* Three things you read rather than use. Quieter, and together. */}
        {/* Under the two actions, because starting a game and scoring a hand
          are what people open this screen for. Rules and Stats are not here
          at all: they belong to a game, and this screen is not one. */}
        {/* Not three little boxes. A card is for an object; these are links
          to things you read, so they are grouped by a hairline and a gap
          like a list rather than fenced off one by one. History is here only
          when it is not already up beside Delete, so it appears exactly once
          however the screen is arranged. */}
        <nav aria-label="Reference" className="flex flex-col">
          {!inProgress && (
            <ReadingLink
              onClick={() => go('games', null)}
              hint="Every game you have played, with its final scores"
            >
              History
            </ReadingLink>
          )}
          <ReadingLink
            onClick={() => go('glossary', null)}
            hint="Every term the app uses, in characters and in English"
          >
            Glossary
          </ReadingLink>
          <ReadingLink
            onClick={() => go('about', null)}
            hint="A short tour of recording a hand, the rules and sharing the tally"
            hintAlign="end"
          >
            How this works
          </ReadingLink>
        </nav>

        {hasGames && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Games are kept on this device. Send the tally to the group when you
            are done.
          </p>
        )}
      </main>

      {/* Deleting the game you were sitting in sends you here, so the offer
        to put it back has to be here too. */}
      <DeletedGameToast />

      {/* Keyed so each open starts fresh, and on the walkthrough or not
        depending on which door was taken. */}
      <GameSheet
        key={newGameOpen ? (walkthroughFirst ? 'new-walk' : 'new') : 'closed'}
        open={newGameOpen}
        startInWalkthrough={walkthroughFirst}
        editing={null}
        // The last game's table is nearly always this game's table, so the
        // names and the house rules come forward rather than being retyped.
        // The sample game is not one of theirs, so it carries nothing
        // forward: a first time table would otherwise find four strangers
        // and somebody else's house rules already filled in.
        lastPlayers={played[0]?.players}
        lastRules={played[0]?.rules}
        lastRuleSetName={played[0]?.ruleSetName}
        onClose={() => setNewGameOpen(false)}
        onSave={async (draft) => {
          const game = await createGame(draft);
          setNewGameOpen(false);
          go('table', game.id);
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

/** One of the two ways into a new game, drawn as the other one's equal. */
function DoorButton({
  onClick,
  label,
  detail,
}: {
  onClick: () => void;
  label: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tile-sm tile-pressable touch flex w-full flex-col gap-1 rounded-2xl px-4 py-4 text-left"
    >
      <span className="text-lg font-semibold">{label}</span>
      <span
        className="text-sm leading-snug"
        style={{ color: 'var(--muted)' }}
      >
        {detail}
      </span>
    </button>
  );
}

/**
 * One row of the reading list: a label, a chevron, a hairline under it.
 *
 * Deliberately not a card. Three cards in a row read as three more things to
 * do, competing with the two that matter; three rows read as a contents page,
 * which is what they are.
 */
function ReadingLink({
  onClick,
  hint,
  hintAlign,
  children,
}: {
  onClick: () => void;
  hint: string;
  hintAlign?: 'center' | 'end';
  children: React.ReactNode;
}) {
  const { anchorProps, targetProps, bubble } = useHint(hint, hintAlign);
  return (
    <HintAnchor className="w-full" {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        {...targetProps}
        className="touch flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {children}
        <span aria-hidden="true" style={{ color: 'var(--muted)' }}>
          &rsaquo;
        </span>
      </button>
      {bubble}
    </HintAnchor>
  );
}

/**
 * A small bordered button, sized to its label.
 *
 * All that is left of it is the History beside Delete, where a box is right:
 * it sits in a row with a destructive text link and needs to not look like
 * one.
 */
function SmallButton({
  onClick,
  hint,
  children,
}: {
  onClick: () => void;
  hint: string;
  children: React.ReactNode;
}) {
  const { anchorProps, targetProps, bubble } = useHint(hint);
  return (
    <HintAnchor {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        {...targetProps}
        className="tile-sm tile-pressable touch rounded-xl px-4 py-2 text-xs font-semibold"
      >
        {children}
      </button>
      {bubble}
    </HintAnchor>
  );
}
