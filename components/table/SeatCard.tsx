'use client';

import { DEALER_CHAR, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatColor } from '@/lib/game/seats';
import { termForHandType } from '@/lib/terms';
import { Wind } from '@/components/ui/Wind';
import { Delta } from '@/components/ui/Score';

/**
 * One player's tile at the table: their wind, name, running score, what the
 * last hand did to them, and the dealer marker when it is their deal.
 *
 * The tile carries both things a player can do to a hand. Tapping the body
 * says they won it. The strip underneath says they called a win they did not
 * have, which is not a kind of winning and so is not reached through one.
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
  onFalseWin,
  falseWinLabel,
  pulse = false,
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
  /** Records a false win against this player, with no winner involved. */
  onFalseWin?: () => void;
  falseWinLabel?: string;
  /** Draws the eye to the seats before the first hand is ever recorded. */
  pulse?: boolean;
}) {
  const wind = SEAT_WINDS[seat];
  const color = seatColor(seat);
  const zaaWu = termForHandType('zaa_wu');

  const inner = (
    <>
      <div className="flex items-baseline gap-1.5">
        <Wind wind={wind} className="text-base leading-none" label />
        <span
          className={`min-w-0 truncate font-semibold ${
            compact ? 'text-sm' : 'text-[0.95rem]'
          }`}
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

  const bodyClass = `flex w-full flex-col justify-between text-left ${
    compact ? 'gap-1 px-2.5 py-2' : 'gap-1.5 px-3 py-2.5'
  }`;
  const style = { borderTopColor: color, borderTopWidth: 3 };

  const badge = isDealer && (
    <span
      className="absolute -top-2 -right-1.5 z-10 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6rem] leading-none font-semibold shadow-sm"
      style={{ background: 'var(--badge-bg)', color: 'var(--on-badge)' }}
    >
      <span lang="zh-Hant" className="hanzi text-xs" aria-hidden="true">
        {DEALER_CHAR}
      </span>
      Dealer
    </span>
  );

  if (!onSelect) {
    return (
      <div className="tile relative w-full" style={style}>
        {badge}
        <div className={bodyClass}>{inner}</div>
      </div>
    );
  }

  return (
    <div
      className={`tile tile-pressable relative w-full${pulse ? ' seat-pulse' : ''}`}
      style={style}
    >
      {badge}

      <button
        type="button"
        onClick={onSelect}
        aria-label={selectLabel ?? `Record a hand won by ${name}`}
        className={`${bodyClass} touch`}
      >
        {inner}
      </button>

      {onFalseWin && (
        <button
          type="button"
          onClick={onFalseWin}
          aria-label={falseWinLabel ?? `Record a false win called by ${name}`}
          // Quiet, and the full width of the tile, so it is clearly this
          // player's but never competes with the win above it. Deliberately a
          // smaller target than the win: it is rare, and it costs points.
          className="flex w-full items-center justify-center gap-1 rounded-b-[inherit] px-2 text-[0.7rem] leading-none font-semibold"
          style={{
            minHeight: 32,
            borderTop: '1px solid var(--line)',
            background: 'var(--line)',
            color: 'var(--muted)',
          }}
        >
          <span lang="zh-Hant" className="hanzi" aria-hidden="true">
            {zaaWu.zh}
          </span>
          <span className="truncate">{zaaWu.english}</span>
        </button>
      )}
    </div>
  );
}
