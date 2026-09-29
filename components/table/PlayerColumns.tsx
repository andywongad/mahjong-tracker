'use client';

import { SEATS, type PlayerNames, type Seat } from '@/lib/scoring';
import { seatColor } from '@/lib/game/seats';

/**
 * The four player names across the hand log's columns.
 *
 * Shown above the hands and again above the tally, so a long log can be read
 * from either end without scrolling back for the names. The leading spacer
 * matches the tag column on each hand row, which is what keeps every figure
 * under its own name.
 */
export function PlayerColumns({
  players,
  className = '',
  style,
}: {
  players: PlayerNames;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`flex gap-1 pr-3 ${className}`} style={style}>
      <span className="w-14 shrink-0" aria-hidden="true" />
      <div className="grid flex-1 grid-cols-4 gap-1">
        {SEATS.map((seat: Seat) => (
          <span key={seat} className="flex items-center justify-end gap-1">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: seatColor(seat) }}
            />
            <span
              className="truncate text-[0.7rem]"
              style={{ color: 'var(--muted)' }}
            >
              {players[seat]}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
