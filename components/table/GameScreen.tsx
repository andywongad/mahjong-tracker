'use client';

import { useMemo, useState } from 'react';
import {
  HAND_TYPE_LABELS,
  replay as replayGame,
  type Hand,
  type HandRow,
  type Seat,
} from '@/lib/scoring';
import { useGame } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { formatGameDate } from '@/lib/game/format';
import { describeHand } from '@/lib/game/describe';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { markRecorded, useFirstRecord } from '@/lib/hooks/useFirstRecord';
import { logEvent } from '@/lib/telemetry/events';
import { AppHeader, HeaderButton } from '@/components/ui/AppHeader';
import { OfflineBadge } from '@/components/ui/OfflineBadge';
import { UndoToast } from '@/components/ui/UndoToast';
import { TableSurface } from './TableSurface';
import { HandLog } from './HandLog';
import { RecordHandSheet } from '@/components/sheets/RecordHandSheet';
import { FalseWinSheet } from '@/components/sheets/FalseWinSheet';
import { TallySummary } from './TallySummary';
import { ScoreChart } from '@/components/stats/ScoreChart';

/** What the undo toast is currently offering to take back. */
interface Undoable {
  handId: string;
  message: string;
}

export function GameScreen({ gameId }: { gameId: string }) {
  const { game, loading, addHand, updateHand, deleteHand, updateGame } =
    useGame(gameId);
  const { go } = useNavigation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [falseWinOpen, setFalseWinOpen] = useState(false);
  const [editing, setEditing] = useState<HandRow | null>(null);
  const [presetSeat, setPresetSeat] = useState<Seat | null>(null);
  const [undoable, setUndoable] = useState<Undoable | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const neverRecorded = useFirstRecord();

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

  /** The same sheet with nobody chosen yet, for the button rather than the table. */
  function openWithPicker() {
    setEditing(null);
    setPresetSeat(null);
    setUndoable(null);
    setSheetOpen(true);
  }

  function openEdit(row: HandRow) {
    setEditing(row);
    setPresetSeat(null);
    setUndoable(null);
    setSheetOpen(true);
  }

  /** Every new hand lands the same way: saved, then undoable for six seconds. */
  async function record(hand: Hand) {
    const handId = await addHand(game!.id, hand);
    markRecorded();
    setUndoable({ handId, message: describeHand(hand, game!.players) });
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
      <AppHeader
        wide
        title={formatGameDate(game.date)}
        subtitle={game.players.join(' · ')}
        actions={
          <>
            <HeaderButton onClick={() => go('stats')}>Stats</HeaderButton>
            <HeaderButton onClick={() => go('games', null)}>Games</HeaderButton>
          </>
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className={`page-wide px-4 py-4 ${live ? 'pad-record-bar' : 'pad-safe-bottom'}`}
      >
        {/* One column until there is room for two. On a desktop the table and
          the log take the left, and what you read while scrolling them stays
          beside them instead of below. */}
        <div className="flex flex-col gap-5 desktop:grid desktop:grid-cols-[minmax(0,40rem)_minmax(22.5rem,26.25rem)] desktop:items-start desktop:gap-6">
          <div className="flex min-w-0 flex-col gap-5">
            <TableSurface
              game={game}
              replay={result}
              onSelectSeat={live ? openForSeat : undefined}
              endedEarly={endedEarly}
              // Only on a game that has barely started: a nudge over a sample game
              // already nineteen hands deep is noise, not help.
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
                {/* The table is the fast way in on a phone, where the pinned bar
              carries the same action. With room beside it, the button is the
              one that should be obvious. */}
                <button
                  type="button"
                  onClick={openWithPicker}
                  className="touch hidden w-full rounded-xl py-3 text-sm font-semibold tablet:block"
                  style={{ background: 'var(--tile-back)', color: '#fff' }}
                >
                  Record hand {nextHand}
                </button>

                {/* Neither of these has a winner, so neither belongs in the sheet
              that records one. */}
                <div className="grid grid-cols-2 gap-2">
                  <SecondaryAction
                    hanzi={HAND_TYPE_LABELS.draw.hanzi}
                    label={HAND_TYPE_LABELS.draw.english}
                    onClick={() => {
                      setUndoable(null);
                      void record({ type: 'draw' });
                    }}
                  />
                  <SecondaryAction
                    hanzi={HAND_TYPE_LABELS.zaa_wu.hanzi}
                    label={HAND_TYPE_LABELS.zaa_wu.english}
                    onClick={() => {
                      setUndoable(null);
                      setFalseWinOpen(true);
                    }}
                  />
                </div>
              </div>
            )}

            <OfflineBadge />

            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold">Hands</h2>
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
                <h2 className="text-base font-bold">Running score</h2>
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
                        boxShadow: '0 3px 0 #0e4a38',
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
          </aside>
        </div>
      </main>

      {/* Pinned to the bottom edge, where a thumb already is. The toast sits
        above the bar so neither hides the other. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-[36rem] flex-col gap-2">
          {undoable && (
            <UndoToast
              key={undoable.handId}
              message={undoable.message}
              onUndo={undo}
              onDismiss={() => setUndoable(null)}
            />
          )}

          {live && (
            <button
              type="button"
              onClick={openWithPicker}
              className="touch pointer-events-auto w-full rounded-xl px-4 py-2.5 text-center tablet:hidden"
              style={{
                background: 'var(--tile-back)',
                color: '#fff',
                boxShadow: 'var(--shadow-sheet)',
              }}
            >
              <span className="block text-sm font-semibold">
                Record hand {nextHand}
              </span>
              <span className="block text-xs opacity-80">
                or tap the winner on the table
              </span>
            </button>
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
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSave={save}
        onDelete={editing ? remove : undefined}
        onSwitchToFalseWin={() => setFalseWinOpen(true)}
      />

      <FalseWinSheet
        key={
          falseWinOpen ? `false-win-${result.handCount}` : 'false-win-closed'
        }
        open={falseWinOpen}
        game={game}
        handNumber={nextHand}
        onClose={() => setFalseWinOpen(false)}
        onSave={record}
      />
    </>
  );
}

/** A draw or a false win: equal weight, plainly secondary to recording a win. */
function SecondaryAction({
  hanzi,
  label,
  onClick,
}: {
  hanzi: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold"
      style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
    >
      <span
        lang="zh-Hant"
        className="hanzi text-base leading-none"
        aria-hidden="true"
      >
        {hanzi}
      </span>
      {label}
    </button>
  );
}
