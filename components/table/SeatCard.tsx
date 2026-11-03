'use client';

import { DEALER_CHAR, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatColor } from '@/lib/game/seats';
import { termForHandType } from '@/lib/terms';
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
 * The quiet word over a number, saying which number it is.
 *
 * The total's label is set as an eyebrow — capitals, tracked, a point larger
 * — and the last hand's is a point under it, so the two blocks are ranked by
 * their labels before either number is read. Twelve is the floor, so the
 * ranking is made by lifting the first rather than dropping the second.
 */
function NumberLabel({
  children,
  eyebrow = false,
}: {
  children: React.ReactNode;
  eyebrow?: boolean;
}) {
  return (
    <span
      className={`leading-tight font-semibold ${
        eyebrow ? 'text-[0.8125rem] tracking-wide uppercase' : 'text-xs'
      }`}
      style={{ color: 'var(--muted)' }}
    >
      {children}
    </span>
  );
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
  /**
   * Records a false win called by this player, with no winner involved.
   *
   * Back on the card rather than under the table: it belongs to a person,
   * and the person is what you are looking at when you need it.
   */
  onFalseWin?: () => void;
  falseWinLabel?: string;
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
        <span className="flex min-w-0 items-baseline gap-1">
          <Wind wind={wind} className="text-sm leading-none" />
          {/* The wind's English gives way to the dealer badge. Both will not
            fit on a 110px card, the character already says which seat this
            is, and whose deal it is matters more for the hand being played.
            Wind renders the English for a screen reader either way. */}
          {!isDealer && (
            <span
              className="truncate text-xs leading-none"
              style={{ color: 'var(--muted)' }}
            >
              {windLabel(wind)}
            </span>
          )}
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

      {/* Both numbers say what they are. They look alike and mean different
        things, and a card with room for the words is worth more than a card
        that saves two lines: a tile is tall anyway. */}
      <div className="flex flex-col">
        <NumberLabel eyebrow>Total</NumberLabel>
        <span
          className="tnum display leading-none font-bold text-hero tablet:text-hero-lg"
        >
          {formatSigned(score)}
        </span>
      </div>

      {/* Only when the last hand actually moved this player. Before the
        first hand, and on a hand that cost them nothing, there is nothing
        to say and the card stays quiet. */}
      {lastDelta !== 0 && (
        <div className="flex flex-col items-start gap-0.5">
          <NumberLabel>Last hand</NumberLabel>
          <span
            className="rounded-pill px-1.5 py-0.5 text-xs leading-none font-semibold"
            style={{
              background: lastDelta > 0 ? 'var(--gain)' : 'var(--loss)',
              color: '#fff',
            }}
          >
            {formatSigned(lastDelta)}
          </span>
        </div>
      )}
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

  const zaaWu = termForHandType('zaa_wu');

  return (
    <div
      // Clipped, so the strip at the foot ends in the card's own corners.
      className={`tile relative w-full overflow-hidden${pulse ? ' seat-pulse' : ''}`}
      style={style}
    >
      {/* The card above the strip is the win. Two controls, never nested:
        a button inside a button is invalid and swallows the inner one. */}
      <button
        type="button"
        onClick={onSelect}
        // Said the way it would be read out: who, where they sit, where they
        // stand, and then what tapping does.
        aria-label={
          selectLabel ??
          `${name}, ${windLabel(wind)}, ${spokenScore(score)}. Record a win for ${name}.`
        }
        className="seat-press w-full"
      >
        <span className={infoClass}>{inner}</span>
      </button>

      {onFalseWin && (
        <button
          type="button"
          onClick={onFalseWin}
          aria-label={falseWinLabel ?? `Record a false win called by ${name}`}
          className="seat-strip flex w-full items-center justify-center px-1 py-2 text-xs leading-none font-semibold whitespace-nowrap"
        >
          {/* Words only. A seat card has about 110px, which holds the label
            or the characters beside it but not both, and half a label is
            worse than no characters. 詐糊 is still on every false win in the
            log below, where there is room for it. */}
          {zaaWu.english}
        </button>
      )}
    </div>
  );
}
