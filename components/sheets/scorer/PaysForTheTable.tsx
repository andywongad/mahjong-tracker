'use client';

import { useState } from 'react';
import { SEATS, type Liability, type PlayerNames, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { Wind } from '@/components/ui/Wind';
import { TileChoice } from '@/components/ui/TileChoice';
import { definitionOf, glossOf, romanOf } from '@/lib/terms';

/**
 * 包: somebody paying what the whole table would have paid.
 *
 * One checkbox and a sentence. The rules are listed as examples rather than
 * offered as a choice, because which of them happened is a thing the table
 * already knows and the app never needs: the money moves the same way under
 * every one of them, and the only two facts worth recording are that it
 * happened and who is paying.
 *
 * That is also what keeps this small enough to sit on every hand. Asked as a
 * list of buttons it ran to four hundred pixels, which is a lot of screen for
 * a question most hands answer no to.
 *
 * The names are hot text: tapping one explains it underneath, in the same
 * sentence the glossary carries. They do not open the glossary itself, which
 * would put a second sheet over this one, and a sheet over a sheet is how the
 * guide once closed the form behind it.
 *
 * A table that plays none of these never sees the row, because the house
 * rules say which to list and an empty list means none.
 */
export function PaysForTheTable({
  players,
  reasons,
  winnerSeat,
  value,
  onChange,
}: {
  players: PlayerNames;
  /** Which rules to name as examples, from the house rules. */
  reasons: string[];
  winnerSeat: Seat;
  value: Liability | undefined;
  onChange: (liability: Liability | undefined) => void;
}) {
  /** Ticked without a payer yet, which is a question half answered. */
  const [asking, setAsking] = useState(false);
  /** Which example is being explained, if any. */
  const [explaining, setExplaining] = useState<string | null>(null);
  if (reasons.length === 0) return null;

  const on = Boolean(value) || asking;

  function toggle() {
    if (on) {
      setAsking(false);
      onChange(undefined);
      return;
    }
    setAsking(true);
  }

  return (
    <section className="tile-sm flex flex-col gap-2 px-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={toggle}
        className="touch flex items-center gap-2.5 text-left"
      >
        <Box checked={on} />
        <span className="text-sm font-semibold">
          Someone pays for the table{' '}
          <span lang="zh-Hant" className="hanzi">
            包
          </span>
        </span>
      </button>

      {/* Always here, ticked or not: it is the explanation of what the line
        above is asking, and a question nobody understands is a question
        answered wrongly. */}
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Examples:{' '}
        {reasons.map((reason, index) => (
          <span key={reason}>
            {index > 0 && ', '}
            <button
              type="button"
              onClick={() =>
                setExplaining(explaining === reason ? null : reason)
              }
              aria-expanded={explaining === reason}
              className="underline decoration-dotted underline-offset-2"
              style={{
                color: explaining === reason ? 'var(--ink)' : 'var(--muted)',
              }}
            >
              {glossOf(reason)}
            </button>
          </span>
        ))}
        , and anything else your table plays this way.
      </p>

      {explaining && (
        <p className="text-xs" style={{ color: 'var(--ink)' }}>
          {definitionOf(explaining)}
        </p>
      )}

      {on && (
        <>
          <h3 className="text-sm font-semibold">Who pays?</h3>
          <div className="grid grid-cols-3 gap-2">
            {pickableSeats(winnerSeat).map((seat) => (
              <TileChoice
                key={seat}
                selected={value?.seat === seat}
                accent={seatSolid(seat)}
                onClick={() => {
                  setAsking(false);
                  onChange({ seat, reason: value?.reason });
                }}
              >
                <Wind wind={SEAT_WINDS[seat]} className="text-sm leading-none" />
                <span className="w-full truncate text-xs font-semibold">
                  {players[seat]}
                </span>
              </TileChoice>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {value
              ? `${romanOf('baau')}: they pay what all three would have paid, and the winner collects the same either way.`
              : 'Nothing is counted until you say who pays.'}
          </p>
        </>
      )}
    </section>
  );
}

/** Everyone but the winner, who can never be liable for their own hand. */
function pickableSeats(winnerSeat: Seat): Seat[] {
  return SEATS.filter((seat) => seat !== winnerSeat);
}

/** A box with a tick in it, at the weight the header icons are drawn to. */
function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
      style={
        checked
          ? { background: 'var(--tile-back)' }
          : { border: '1.5px solid var(--line-strong)' }
      }
    >
      {checked && (
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable={false}
        >
          <path d="m5 13 4 4 10-10" />
        </svg>
      )}
    </span>
  );
}
