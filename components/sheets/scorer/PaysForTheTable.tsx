'use client';

import { useState } from 'react';
import { SEATS, type Liability, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { Wind } from '@/components/ui/Wind';
import { TileChoice } from '@/components/ui/TileChoice';
import { romanOf, glossOf } from '@/lib/terms';
import type { PlayerNames } from '@/lib/scoring';

/**
 * 包: somebody paying what the whole table would have paid.
 *
 * Folded away by default, and that is the main design decision here. Most
 * hands are not one of these, most tables play one or two of the rules at
 * most, and a beginner being asked "did anybody complete a fourth exposed
 * set of one suit from your discard" on every hand would learn to tap past
 * the question rather than read it. A table that does not play any of them
 * never sees the row at all, because the house rules say which to offer and
 * an empty list means none.
 *
 * It opens on the reasons rather than on the seats, because the reason is
 * what somebody at the table just said out loud.
 */
export function PaysForTheTable({
  players,
  reasons,
  winnerSeat,
  discarderSeat,
  selfDrawn,
  value,
  onChange,
}: {
  players: PlayerNames;
  /** Reason ids this table plays, in the order they are offered. */
  reasons: string[];
  winnerSeat: Seat;
  /** Preselected as the payer on a discard win, and still changeable. */
  discarderSeat: Seat | null;
  selfDrawn: boolean;
  value: Liability | undefined;
  onChange: (liability: Liability | undefined) => void;
}) {
  const [open, setOpen] = useState(Boolean(value));
  if (reasons.length === 0) return null;

  function pick(reason: string) {
    if (value?.reason === reason) {
      onChange(undefined);
      return;
    }
    // The player who fed it is liable far more often than not, so a discard
    // win starts with them chosen and the other two a tap away.
    const seat =
      value?.seat ??
      (discarderSeat !== null && discarderSeat !== winnerSeat
        ? discarderSeat
        : null);
    onChange({ reason, seat: seat ?? pickableSeats(winnerSeat)[0] });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="touch flex items-center justify-between gap-3 px-1 text-left"
      >
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Someone pays for the table?{' '}
          <span lang="zh-Hant" className="hanzi">
            包
          </span>
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-xs"
          style={{ color: 'var(--muted)' }}
        >
          ▾
        </span>
      </button>
    );
  }

  const chosen = value?.reason;
  const offered = [...reasons, 'other'];

  return (
    <fieldset className="mt-1 flex flex-col gap-2">
      <legend className="mb-1.5 text-base font-bold">
        Someone pays for the table?{' '}
        <span lang="zh-Hant" className="hanzi">
          包
        </span>
      </legend>

      <div className="flex flex-wrap gap-2">
        {offered.map((reason) => {
          const on = chosen === reason;
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={on}
              onClick={() => pick(reason)}
              className="tile-sm touch px-3 text-sm font-semibold"
              style={
                on
                  ? {
                      background: 'var(--tile-back)',
                      color: '#fff',
                      borderColor: 'transparent',
                    }
                  : undefined
              }
            >
              {reason === 'other' ? 'Other' : glossOf(reason)}
            </button>
          );
        })}
        {!chosen && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="touch px-2 text-xs underline underline-offset-2"
            style={{ color: 'var(--muted)' }}
          >
            Nobody
          </button>
        )}
      </div>

      {/* Only applies to self drawn wins at most tables, and saying so is
        worth more than refusing: a table that plays it another way is not
        wrong, it is a different table. */}
      {chosen === 'twelve_pieces' && !selfDrawn && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {glossOf('twelve_pieces')} usually applies only to self-drawn wins.
        </p>
      )}

      {chosen && (
        <>
          <p className="text-sm font-semibold">Who pays?</p>
          <div className="grid grid-cols-3 gap-2">
            {pickableSeats(winnerSeat).map((seat) => (
              <TileChoice
                key={seat}
                selected={value?.seat === seat}
                accent={seatSolid(seat)}
                onClick={() => onChange({ reason: chosen, seat })}
              >
                <Wind wind={SEAT_WINDS[seat]} className="text-sm leading-none" />
                <span className="w-full truncate text-xs font-semibold">
                  {players[seat]}
                </span>
              </TileChoice>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {romanOf('baau')}: they pay what all three would have paid, and the
            winner collects the same either way.
          </p>
        </>
      )}
    </fieldset>
  );
}

/** Everyone but the winner, who can never be liable for their own hand. */
function pickableSeats(winnerSeat: Seat): Seat[] {
  return SEATS.filter((seat) => seat !== winnerSeat);
}
