'use client';

import { DEALER_CHAR, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatColor } from '@/lib/game/seats';
import { Wind, windLabel } from '@/components/ui/Wind';
import { Delta } from '@/components/ui/Score';

/**
 * One player's tile at the table: their wind, name, running score, what the
 * last hand did to them, and the dealer marker when it is their deal.
 */
export function SeatCard({
  seat,
  name,
  score,
  lastDelta,
  isDealer,
  compact = false,
  onSelect,
  selectLabel,
}: {
  seat: Seat;
  name: string;
  score: number;
  lastDelta: number;
  isDealer: boolean;
  compact?: boolean;
  /** Makes the card the way a hand is recorded. */
  onSelect?: () => void;
  /** What tapping the card does, for screen readers. */
  selectLabel?: string;
}) {
  const wind = SEAT_WINDS[seat];
  const color = seatColor(seat);

  const inner = (
    <>
      {isDealer && (
        <span
          lang="zh-Hant" className="hanzi absolute -top-2 -right-1.5 grid h-7 w-7 place-items-center rounded-full text-sm leading-none shadow-sm"
          style={{ background: 'var(--badge-bg)', color: 'var(--on-badge)' }}
          title="Dealer"
        >
          <span aria-hidden="true">{DEALER_CHAR}</span>
          <span className="sr-only">Dealer</span>
        </span>
      )}

      <div className="flex items-baseline gap-1.5">
        <Wind wind={wind} className="text-base leading-none" />
        <span className="sr-only">{windLabel(wind)}. </span>
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span
          className={`truncate font-semibold ${compact ? 'text-sm' : 'text-[0.95rem]'}`}
        >
          {name}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className={`tnum font-bold ${compact ? 'text-xl' : 'text-2xl'}`}>
          {score}
        </span>
        <span className="text-xs">
          <Delta value={lastDelta} />
        </span>
      </div>
    </>
  );

  const className = `tile relative flex w-full flex-col justify-between text-left ${
    compact ? 'gap-1 px-2.5 py-2' : 'gap-1.5 px-3 py-2.5'
  }`;
  const style = { borderTopColor: color, borderTopWidth: 3 };

  if (!onSelect) {
    return (
      <div className={className} style={style}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={selectLabel ?? `Record a hand won by ${name}`}
      className={`${className} tile-pressable touch`}
      style={style}
    >
      {inner}
    </button>
  );
}
