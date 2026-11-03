'use client';

import { useMemo, useState } from 'react';
import {
  replay as replayGame,
  type Hand,
  type HandRow,
  type Seat,
} from '@/lib/scoring';
import { useGame } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { formatGameDate } from '@/lib/game/format';
import { summariseSave } from '@/lib/game/describe';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import {
  dismissSeatHint,
  markRecorded,
  useFirstRecord,
  useSeatHint,
} from '@/lib/hooks/useFirstRecord';
import { logEvent } from '@/lib/telemetry/events';
import { termForHandType } from '@/lib/terms';
import { OfflineBadge } from '@/components/ui/OfflineBadge';
import { UndoToast } from '@/components/ui/UndoToast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TableSurface } from './TableSurface';
import { HandLog } from './HandLog';
import { RecordHandSheet } from '@/components/sheets/RecordHandSheet';
import { TallySummary } from './TallySummary';
import { ScoreChart } from '@/components/stats/ScoreChart';

/**
 * What the undo toast is currently offering to take back.
 *
 * The id only. What the toast says is worked out from the hand list at render
 * time, so the line and the log can never disagree about what was just saved.
 */
interface Undoable {
  handId: string;
}

export function GameScreen({ gameId }: { gameId: string }) {
  const {
    game,
    loading,
    addHand,
    updateHand,
    deleteHand,
    updateGame,
    deleteGame,
  } = useGame(gameId);
  const { go } = useNavigation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<HandRow | null>(null);
  const [presetSeat, setPresetSeat] = useState<Seat | null>(null);
  const [undoable, setUndoable] = useState<Undoable | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const neverRecorded = useFirstRecord();
  const showSeatHint = useSeatHint();

  // Keep the screen awake while a game is on the table.
  useWakeLock(Boolean(game));

  const result = useMemo(() => (game ? replayGame(game) : null), [game]);
  // Called early or played out: either way the game is done.
  const endedEarly = Boolean(game?.endedAt);
  const finished = Boolean(result?.isComplete) || endedEarly;

  if (loading) {
    return (
      <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </p>
    );
  }

  if (!game || !result) {
    return (
      <div className="p-6">
        <p className="text-sm">That game is not on this device.</p>
        <button
          type="button"
          onClick={() => go('games', null)}
          className="mt-3 inline-block text-sm underline"
        >
          Back to games
        </button>
      </div>
    );
  }

  const live = !endedEarly;
  const nextHand = result.handCount + 1;

  /** Tapping a seat says who won, before the sheet has asked anything. */
  function openForSeat(seat: Seat) {
    setEditing(null);
    setPresetSeat(seat);
    setUndoable(null);
    setSheetOpen(true);
  }

  function openEdit(row: HandRow) {
    setEditing(row);
    setPresetSeat(null);
    setUndoable(null);
    setSheetOpen(true);
  }

  /** Every new hand lands the same way: saved, then undoable for a few seconds. */
  async function record(hand: Hand) {
    const handId = await addHand(game!.id, hand);
    markRecorded();
    setUndoable({ handId });
  }

  /**
   * A false win, straight from the seat of whoever called it.
   *
   * Nothing else is needed: there is no winner, and the penalty comes from the
   * rules. Like a draw it is one tap, and like every other hand it can be
   * taken back for a few seconds afterwards.
   */
  async function recordFalseWin(seat: Seat) {
    setUndoable(null);
    await record({ type: 'zaa_wu', offenderSeat: seat });
  }

  async function undo() {
    if (!undoable) return;
    await deleteHand(game!.id, undoable.handId);
    logEvent('undo_used');
    setUndoable(null);
  }

  async function save(hand: Hand) {
    if (editing) {
      await updateHand(game!.id, game!.hands[editing.index].id, hand);
      return;
    }
    await record(hand);
  }

  async function remove() {
    if (!editing) return;
    await deleteHand(game!.id, game!.hands[editing.index].id);
  }

  return (
    <>
      <ScreenHeader
        wide
        title={formatGameDate(game.date)}
        subtitle={game.players.join(' · ')}
      />

      <main
        id="main"
        tabIndex={-1}
        className="page-wide pad-safe-bottom px-4 py-4"
      >
        {/* One column until there is room for two. On a desktop the table and
          the log take the left, and what you read while scrolling them stays
          beside them instead of below. */}
        <div className="flex flex-col gap-5 desktop:grid desktop:grid-cols-[minmax(0,40rem)_minmax(22.5rem,26.25rem)] desktop:items-start desktop:gap-6">
          <div className="flex min-w-0 flex-col gap-5">
            {live && showSeatHint && (
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--tile-face)' }}
                role="note"
              >
                <span className="text-sm">
                  Tap the winner&rsquo;s seat to record a hand.
                </span>
                <button
                  type="button"
                  onClick={dismissSeatHint}
                  className="touch shrink-0 px-2 text-sm font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Got it
                </button>
              </div>
            )}

            <TableSurface
              game={game}
              replay={result}
              onSelectSeat={live ? openForSeat : undefined}
              endedEarly={endedEarly}
              // Only on a game that has barely started: a nudge over a sample game
              // already nineteen hands deep is noise, not help.
              onFalseWin={live ? recordFalseWin : undefined}
              pulseSeats={live && neverRecorded && result.handCount < 3}
            />

            {endedEarly ? (
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{
                  background: 'var(--tile-face)',
                  border: '1px solid var(--line-strong)',
                }}
              >
                <span className="text-sm">
                  Game ended after {result.handCount}{' '}
                  {result.handCount === 1 ? 'hand' : 'hands'}.
                </span>
                <button
                  type="button"
                  onClick={() => updateGame(game!.id, { endedAt: undefined })}
                  className="touch shrink-0 px-2 text-sm font-semibold underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Reopen
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* A draw belongs to nobody, so it is recorded from under
                  the table rather than from a seat. A false win belongs to
                  whoever called it, and is on their card. */}
                <SecondaryAction
                  hanzi={termForHandType('draw').zh}
                  label={termForHandType('draw').english}
                  onClick={() => {
                    setUndoable(null);
                    void record({ type: 'draw' });
                  }}
                />
              </div>
            )}

            <OfflineBadge />

            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold">Hands</h2>
                <span
                  className="tnum text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  {result.handCount} played
                </span>
              </div>
              <HandLog
                rows={result.rows}
                game={game}
                onEdit={openEdit}
                footer={
                  result.handCount > 0 ? <TallySummary game={game} /> : null
                }
              />
            </section>
          </div>

          <aside className="flex flex-col gap-3 desktop:sticky desktop:top-20">
            {/* The side column exists to hold what you read while scrolling the
              log. On a phone the chart lives on Stats and this is skipped. */}
            {result.handCount > 0 && (
              <section className="hidden flex-col gap-2 desktop:flex">
                <h2 className="text-lg font-bold">Running score</h2>
                <div className="tile-sm px-3 py-3">
                  <ScoreChart
                    series={result.series}
                    players={game.players}
                    rounds={result.rows.map((row) => row.round)}
                  />
                </div>
              </section>
            )}

            {result.handCount > 0 && (
              // Settling belongs where the game ends, not back on the games list.
              // It leads once the game is final, and waits quietly until then.
              <button
                type="button"
                onClick={() => go('settle')}
                className={`touch w-full rounded-xl py-3 text-sm font-semibold ${
                  finished ? 'tile-pressable' : 'tile-sm tile-pressable'
                }`}
                style={
                  finished
                    ? {
                        background: 'var(--tile-back)',
                        color: '#fff',
                              }
                    : undefined
                }
              >
                Tally details
              </button>
            )}

            {result.handCount > 0 && !endedEarly && !result.isComplete && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmingEnd) {
                    setConfirmingEnd(true);
                    return;
                  }
                  void updateGame(game!.id, {
                    endedAt: new Date().toISOString(),
                  });
                  setConfirmingEnd(false);
                }}
                // A rare, deliberate, reversible action. Kept as a plain link so it
                // does not compete with settling, which is the common next step.
                className="touch mx-auto px-3 text-xs underline underline-offset-2"
                style={{
                  color: confirmingEnd ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {confirmingEnd
                  ? `Tap again to end after ${result.handCount} hands`
                  : 'End game early'}
              </button>
            )}

            {/* Asked twice, unlike Delete on the history list. Not because
              it is less reversible — the same offer to put it back follows
              you home — but because it tears you out of the game you are
              sitting in, and the destructive neighbour of "End game early"
              should not be the easier of the two to set off by accident. */}
            <button
              type="button"
              onClick={() => {
                if (!confirmingDelete) {
                  setConfirmingDelete(true);
                  return;
                }
                void (async () => {
                  await deleteGame(game!.id);
                  go('home', null);
                })();
              }}
              className="touch mx-auto px-3 text-xs underline underline-offset-2"
              style={{
                color: confirmingDelete ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {confirmingDelete
                ? 'Tap again to delete this game'
                : 'Delete this game'}
            </button>
          </aside>
        </div>
      </main>

      {/* Pinned to the bottom edge, where a thumb already is. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-[36rem] flex-col gap-2">
          {undoable && (
            <UndoToast
              key={undoable.handId}
              message={summariseSave(
                result.rows[result.rows.length - 1],
                game.players,
              )}
              onUndo={undo}
              onDismiss={() => setUndoable(null)}
            />
          )}

        </div>
      </div>

      {/* Keyed so each open starts from a clean draft, or from the hand being
          edited, without the sheet resetting itself after the fact. */}
      <RecordHandSheet
        key={
          sheetOpen
            ? `${editing ? editing.index : `new-${presetSeat ?? 'any'}`}-${result.handCount}`
            : 'closed'
        }
        open={sheetOpen}
        game={game}
        handNumber={nextHand}
        presetSeat={presetSeat}
        dealerSeat={result.currentDealerSeat}
        roundWind={result.currentRound}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSave={save}
        onDelete={editing ? remove : undefined}
        onSwitchToFalseWin={recordFalseWin}
      />

      {/* Applied straight to this game, which replays every hand against the
        new rules. The faan recorded never moves; only what it is worth does. */}
    </>
  );
}

/** The way to the outcomes nobody won: plainly secondary to recording a win. */
function SecondaryAction({
  hanzi,
  label,
  onClick,
}: {
  /** A term's character, where the button is one term rather than a door. */
  hanzi?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold"
      style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
    >
      {hanzi && (
        <span
          lang="zh-Hant"
          className="hanzi text-base leading-none"
          aria-hidden="true"
        >
          {hanzi}
        </span>
      )}
      {label}
    </button>
  );
}
