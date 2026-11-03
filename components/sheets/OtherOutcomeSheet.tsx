'use client';

/**
 * The two ways a hand can end that nobody won.
 *
 * They used to live on the seats: a False win button under every player, so
 * the table carried eight buttons and a thing that happens once a night had
 * the same weight as the thing that happens every hand. Here they are reached
 * on purpose, from one quiet button under the table, which is the right
 * amount of effort for an outcome you have to go looking for.
 */

import { useState } from 'react';
import { SEATS, type Seat } from '@/lib/scoring';
import { SEAT_WINDS } from '@/lib/game/seats';
import { termForHandType } from '@/lib/terms';
import { windLabel } from '@/components/ui/Wind';
import { Sheet } from './Sheet';

export function OtherOutcomeSheet({
  open,
  players,
  onClose,
  onDraw,
  onFalseWin,
}: {
  open: boolean;
  players: readonly string[];
  onClose: () => void;
  onDraw: () => void | Promise<void>;
  onFalseWin: (seat: Seat) => void | Promise<void>;
}) {
  // A false win needs to know whose it was, so it asks rather than guessing.
  const [asking, setAsking] = useState(false);
  const draw = termForHandType('draw');
  const zaaWu = termForHandType('zaa_wu');

  return (
    <Sheet
      open={open}
      title={asking ? 'Who called it?' : 'Other outcome'}
      onClose={onClose}
    >
      {asking ? (
        <div className="flex flex-col gap-2">
          {SEATS.map((seat: Seat) => (
            <button
              key={seat}
              type="button"
              onClick={async () => {
                await onFalseWin(seat);
                onClose();
              }}
              className="tile-sm touch flex items-baseline gap-2 px-3 py-3 text-left"
            >
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {windLabel(SEAT_WINDS[seat])}
              </span>
              <span className="text-base font-semibold">{players[seat]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Choice
            zh={draw.zh}
            label={draw.english}
            detail="Nobody won. The deal passes on under most house rules."
            onClick={async () => {
              await onDraw();
              onClose();
            }}
          />
          <Choice
            zh={zaaWu.zh}
            label={zaaWu.english}
            detail="Somebody claimed a win they did not have, and pays a penalty."
            onClick={() => setAsking(true)}
          />
        </div>
      )}
    </Sheet>
  );
}

function Choice({
  zh,
  label,
  detail,
  onClick,
}: {
  zh: string;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tile-sm touch flex flex-col gap-1 px-3 py-3 text-left"
    >
      <span className="flex items-baseline gap-2">
        <span lang="zh-Hant" className="hanzi text-base" aria-hidden="true">
          {zh}
        </span>
        <span className="text-base font-semibold">{label}</span>
      </span>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>
        {detail}
      </span>
    </button>
  );
}
