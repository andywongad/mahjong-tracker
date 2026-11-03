'use client';

import { DEALER_CHAR, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatColor } from '@/lib/game/seats';
import { Wind, windLabel } from '@/components/ui/Wind';
import { formatSigned } from '@/components/ui/Score';

/**
 * One player's tile at the table: their wind, name, running score, what the
 * last hand did to them, and the dealer marker when it is their deal.
 *
 * The whole card is one control, and it means one thing: this player won the
 * hand. It used to carry two buttons of its own, which put eight buttons on
 * the table and gave a false win — a thing that happens once a night, if that
 * — the same weight as the thing that happens every hand. The rare outcomes
 * moved under the table, where they are reached on purpose.
 */

/** A score as it should be read aloud, rather than as it is written. */
function spokenScore(score: number): string {
  if (score > 0) return `plus ${score}`;
  if (score < 0) return `minus ${Math.abs(score)}`;
  return 'level';
}
/**
 * A name that fits, or steps down once, or wraps.
 *
 * Ten characters is the bar: at 390px the side seats have about 110px, which
 * holds ten characters at 15px and thirteen at 13px. Past that it goes to two
 * lines rather than to an ellipsis, because half a name is worse than a name
 * on two lines when four people are reading it from a metre away.
 */
function seatNameClass(name: string, compact: boolean): string {
  // A side seat has about 110px against the top and bottom seats' 150, so it
  // reaches the step down sooner. Ten characters fit either way, which is the
  // bar; past that the size drops once and then the word is allowed to break,
  // since a single long name has no space in it to wrap at.
  const fits = compact ? 8 : 10;
  return name.length <= fits ? 'text-[0.9375rem]' : 'text-[0.8125rem]';
}

export function SeatCard({
  seat,
  name,
  score,
  lastDelta,
  isDealer,
  compact = false,
  onSelect,
  selectLabel,
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
  /** Draws the eye to the seats before the first hand is ever recorded. */
  pulse?: boolean;
}) {
  const wind = SEAT_WINDS[seat];
  const color = seatColor(seat);

  const inner = (
    <>
      {/* Wind and dealer share a row of their own, so the name below gets
        the whole width of the card. Both were competing with it before: the
        stacked wind took a column, and the dealer badge was floating over the
        corner the name ends in. */}
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-baseline gap-1">
          <Wind wind={wind} className="text-sm leading-none" />
          <span className="text-xs leading-none" style={{ color: 'var(--muted)' }}>
            {windLabel(wind)}
          </span>
        </span>
        {isDealer && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-pill px-1.5 py-0.5 text-xs leading-none font-semibold"
            style={{ background: 'var(--badge-bg)', color: 'var(--on-badge)' }}
          >
            <span lang="zh-Hant" className="hanzi" aria-hidden="true">
              {DEALER_CHAR}
            </span>
            Dealer
          </span>
        )}
      </div>

      <span
        className={`leading-tight font-semibold break-words ${seatNameClass(name, compact)}`}
      >
        {name}
      </span>

      {/* The hero. Signed always, so a score is never read as the wrong
        direction, and tabular so it does not jump as it changes. */}
      <div className="flex flex-col gap-1">
        <span
          className={`tnum display leading-none font-bold ${
            compact ? 'text-hero' : 'text-hero'
          } tablet:text-hero-lg`}
        >
          {formatSigned(score)}
        </span>

        {/* Only when the last hand actually moved this player. Before the
          first hand, and on a hand that cost them nothing, there is nothing
          to say and the card stays quiet. */}
        {lastDelta !== 0 && (
          <span
            className="self-start rounded-pill px-1.5 py-0.5 text-xs leading-none font-semibold"
            style={{
              background: lastDelta > 0 ? 'var(--gain)' : 'var(--loss)',
              color: '#fff',
            }}
          >
            <span className="sr-only">Last hand </span>
            {formatSigned(lastDelta)}
          </span>
        )}
      </div>
    </>
  );

  const infoClass = `flex w-full flex-col justify-between text-left ${
    compact ? 'gap-1 px-2.5 py-2.5' : 'gap-1.5 px-3 py-3'
  }`;
  const style = { borderTopColor: color, borderTopWidth: 3 };

  if (!onSelect) {
    return (
      <div className="tile relative w-full" style={style}>
        <div className={infoClass}>{inner}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      // Said the way it would be read out: who, where they sit, where they
      // stand, and then what tapping does.
      aria-label={
        selectLabel ??
        `${name}, ${windLabel(wind)}, ${spokenScore(score)}. Record a win for ${name}.`
      }
      className={`tile seat-press relative w-full${pulse ? ' seat-pulse' : ''}`}
      style={style}
    >
      <span className={infoClass}>{inner}</span>
    </button>
  );
}
