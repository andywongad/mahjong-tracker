'use client';

import { useMemo, useState } from 'react';
import { replay as replayGame, type Hand, type HandRow, type Seat } from '@/lib/scoring';
import { useGame } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { formatGameDate } from '@/lib/game/format';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { AppHeader, HeaderButton } from '@/components/ui/AppHeader';
import { OfflineBadge } from '@/components/ui/OfflineBadge';
import { TableSurface } from './TableSurface';
import { HandLog } from './HandLog';
import { RecordHandSheet } from '@/components/sheets/RecordHandSheet';
import { TallySummary } from './TallySummary';

export function GameScreen({ gameId }: { gameId: string }) {
  const { game, loading, addHand, updateHand, deleteHand, updateGame } = useGame(gameId);
  const { go } = useNavigation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<HandRow | null>(null);
  const [presetSeat, setPresetSeat] = useState<Seat | null>(null);
  // A draw is one tap, so it needs a way back from a mis-tap.
  const [lastDrawId, setLastDrawId] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  // Keep the screen awake while a game is on the table.
  useWakeLock(Boolean(game));

  const result = useMemo(() => (game ? replayGame(game) : null), [game]);
  // Called early or played out: either way the game is done.
  const endedEarly = Boolean(game?.endedAt);
  const finished = Boolean(result?.isComplete) || endedEarly;

  if (loading) {
    return <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>;
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

  function openForSeat(seat: Seat) {
    setEditing(null);
    setPresetSeat(seat);
    setLastDrawId(null);
    setSheetOpen(true);
  }

  function openEdit(row: HandRow) {
    setEditing(row);
    setPresetSeat(null);
    setLastDrawId(null);
    setSheetOpen(true);
  }

  async function recordDraw() {
    await addHand(game!.id, { type: 'draw' });
    // The new hand is last in the list, so it is the one to undo.
    setLastDrawId('pending');
  }

  async function undoDraw() {
    const last = game!.hands[game!.hands.length - 1];
    if (last?.type === 'draw') await deleteHand(game!.id, last.id);
    setLastDrawId(null);
  }

  async function save(hand: Hand) {
    if (editing) {
      await updateHand(game!.id, game!.hands[editing.index].id, hand);
    } else {
      await addHand(game!.id, hand);
    }
  }

  async function remove() {
    if (!editing) return;
    await deleteHand(game!.id, game!.hands[editing.index].id);
  }

  return (
    <>
      <AppHeader
        title={formatGameDate(game.date)}
        subtitle={game.players.join(' · ')}
        actions={
          <>
            <HeaderButton onClick={() => go('stats')}>Stats</HeaderButton>
            <HeaderButton onClick={() => go('games', null)}>Games</HeaderButton>
          </>
        }
      />

      <main id="main" tabIndex={-1} className="flex flex-col gap-5 px-4 py-4 pad-safe-bottom">
        <TableSurface
          game={game}
          replay={result}
          onSelectSeat={endedEarly ? undefined : openForSeat}
          endedEarly={endedEarly}
        />

        {endedEarly ? (
          <div
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--tile-face)', border: '1px solid var(--line-strong)' }}
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
        ) : lastDrawId ? (
          <div
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--tile-face)', border: '1px solid var(--line-strong)' }}
            role="status"
          >
            <span className="text-sm">
              Hand {result.handCount} recorded as a draw.
            </span>
            <button
              type="button"
              onClick={undoDraw}
              className="touch shrink-0 px-2 text-sm font-semibold underline"
              style={{ color: 'var(--accent)' }}
            >
              Undo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={recordDraw}
            className="touch w-full rounded-xl py-3 text-sm font-semibold"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
          >
            <span lang="zh-Hant" className="hanzi" aria-hidden="true">
              流局
            </span>{' '}
            Nobody won, record a draw
          </button>
        )}

        <OfflineBadge />

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Hands</h2>
            <span className="tnum text-xs" style={{ color: 'var(--muted)' }}>
              {result.handCount} played
            </span>
          </div>
          <HandLog
            rows={result.rows}
            game={game}
            onEdit={openEdit}
            footer={result.handCount > 0 ? <TallySummary game={game} /> : null}
          />
        </section>

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
              void updateGame(game!.id, { endedAt: new Date().toISOString() });
              setConfirmingEnd(false);
            }}
            // A rare, deliberate, reversible action. Kept as a plain link so it
            // does not compete with settling, which is the common next step.
            className="touch mx-auto px-3 text-xs underline underline-offset-2"
            style={{ color: confirmingEnd ? 'var(--accent)' : 'var(--muted)' }}
          >
            {confirmingEnd
              ? `Tap again to end after ${result.handCount} hands`
              : 'End game early'}
          </button>
        )}

      </main>

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
        handNumber={result.handCount + 1}
        presetSeat={presetSeat}
        dealerSeat={result.currentDealerSeat}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSave={save}
        onDelete={editing ? remove : undefined}
      />
    </>
  );
}
