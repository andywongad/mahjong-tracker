'use client';

import { useState } from 'react';
import { HAND_TYPE_LABELS, SEATS, type Hand, type Seat } from '@/lib/scoring';
import type { GameRecord } from '@/lib/game/types';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { Sheet } from './Sheet';
import { TileChoice } from '@/components/ui/TileChoice';
import { Wind } from '@/components/ui/Wind';

/**
 * Zaa Wu, on its own.
 *
 * A false win has no winner, so it cannot share the sheet that records one. It
 * asks a single question, which is the whole reason it was moved out here.
 */
export function FalseWinSheet({
  open,
  game,
  handNumber,
  onClose,
  onSave,
}: {
  open: boolean;
  game: GameRecord;
  handNumber: number;
  onClose: () => void;
  onSave: (hand: Hand) => void | Promise<void>;
}) {
  const [offenderSeat, setOffenderSeat] = useState<Seat | null>(null);
  const [saving, setSaving] = useState(false);
  const label = HAND_TYPE_LABELS.zaa_wu;

  async function handleSave() {
    if (offenderSeat == null || saving) return;
    setSaving(true);
    try {
      await onSave({ type: 'zaa_wu', offenderSeat });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      title={`Hand ${handNumber}: ${label.roman}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={offenderSeat == null || saving}
          className="touch w-full rounded-xl px-4 text-base font-semibold"
          style={
            offenderSeat != null && !saving
              ? { background: 'var(--tile-back)', color: '#fff' }
              : {
                  background: 'var(--line)',
                  color: 'var(--muted)',
                  cursor: 'not-allowed',
                }
          }
        >
          {offenderSeat == null
            ? 'Pick who called it'
            : `Save hand ${handNumber}`}
        </button>
      }
    >
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Who called it?</h3>
        <div className="grid grid-cols-4 gap-2">
          {SEATS.map((seat: Seat) => (
            <TileChoice
              key={seat}
              selected={offenderSeat === seat}
              accent={seatSolid(seat)}
              onClick={() => setOffenderSeat(seat)}
            >
              <Wind wind={SEAT_WINDS[seat]} className="text-sm leading-none" />
              <span className="w-full truncate text-xs font-semibold">
                {game.players[seat]}
              </span>
            </TileChoice>
          ))}
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          They pay {game.rules.zaaWuPenalty} to each of the other three. Nobody
          wins the hand.
        </p>
      </section>
    </Sheet>
  );
}
