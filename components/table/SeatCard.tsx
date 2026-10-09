'use client';

import { DEALER_CHAR, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatColor } from '@/lib/game/seats';
import { TERM_BY_ID, termForHandType } from '@/lib/terms';
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
  const sikWu = TERM_BY_ID.sik_wu;

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

  const pad = compact ? 'px-2' : 'px-2.5';
  const infoClass = `flex w-full flex-col justify-between text-left ${
    compact ? 'gap-1 px-2.5 pt-2 pb-1.5' : 'gap-1.5 px-3 pt-2.5 pb-2'
  }`;
  // The two things a player can do to a hand are peers, so they are drawn as
  // peers: the same outlined chip, the same size, one above the other.
  const barClass =
    'seat-action flex w-full items-center justify-center gap-1 overflow-hidden px-1 text-[0.7rem] leading-none font-semibold whitespace-nowrap';
  const barStyle = { minHeight: 30 };
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
        <div className={infoClass}>{inner}</div>
      </div>
    );
  }

  return (
    <div
      className={`tile tile-pressable relative w-full${pulse ? ' seat-pulse' : ''}`}
      style={style}
    >
      {badge}

      {/* The whole upper half is the button, so the win stays the easiest thing
        to hit, but it now says so rather than leaving the scorekeeper to guess
        that a card full of numbers is also a control. */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={selectLabel ?? `Record a hand won by ${name}`}
        className="flex w-full flex-col"
      >
        <span className={infoClass}>{inner}</span>
        <span className={`w-full ${pad} pb-1.5`}>
          <span className={barClass} style={barStyle}>
            <span
              lang="zh-Hant"
              className="hanzi hidden shrink-0 min-[390px]:inline"
              aria-hidden="true"
            >
              {sikWu.zh}
            </span>
            Won
          </span>
        </span>
      </button>

      {onFalseWin && (
        <button
          type="button"
          onClick={onFalseWin}
          aria-label={falseWinLabel ?? `Record a false win called by ${name}`}
          // Its own button, below the one that covers the rest of the tile.
          className={`w-full ${pad} pb-2`}
        >
          <span className={barClass} style={barStyle}>
            <span
              lang="zh-Hant"
              className="hanzi hidden shrink-0 min-[390px]:inline"
              aria-hidden="true"
            >
              {zaaWu.zh}
            </span>
            <span className="truncate">{zaaWu.english}</span>
          </span>
        </button>
      )}
    </div>
  );
}
