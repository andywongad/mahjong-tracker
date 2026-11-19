'use client';

import { useId, useState } from 'react';
import { SEATS, type Liability, type PlayerNames, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { Wind } from '@/components/ui/Wind';
import { TileChoice } from '@/components/ui/TileChoice';
import { glossOf, romanOf } from '@/lib/terms';

/**
 * 包: somebody paying what the whole table would have paid.
 *
 * Folded away by default, because most hands are not one of these and a
 * beginner asked on every hand whether anybody completed a fourth exposed set
 * of one suit from their discard would learn to tap past the question rather
 * than read it. A table that plays none of these rules never sees the row:
 * the house rules say which to offer and an empty list means none.
 *
 * Built as a plain disclosure, which is worth stating because the first
 * attempt was not. One control opens and closes it, in one place, with the
 * chevron turning over: the same thing it does everywhere else that something
 * folds away. It used to offer a "Nobody" button to back out instead, which
 * was a second way to do one job, and worse, it was only there until a reason
 * was chosen - so a hand that had one could not be folded up again at all.
 *
 * Closing is not cancelling. A folded row with an answer in it would be a
 * place to lose money, so the header carries the answer when it is shut.
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
  const panelId = useId();
  if (reasons.length === 0) return null;

  function pick(reason: string) {
    // A chosen reason tapped again is the way to say nobody after all, which
    // is how every other thing on this screen that can be on or off behaves.
    if (value?.reason === reason) {
      onChange(undefined);
      return;
    }
    // Whoever fed it is liable far more often than not, so a discard win
    // starts with them chosen and the other two one tap away.
    const seat =
      value?.seat ??
      (discarderSeat !== null && discarderSeat !== winnerSeat
        ? discarderSeat
        : pickableSeats(winnerSeat)[0]);
    onChange({ reason, seat });
  }

  const chosen = value?.reason;
  const offered = [...reasons, 'other'];

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="tile-sm touch flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">
            Someone pays for the table?{' '}
            <span lang="zh-Hant" className="hanzi">
              包
            </span>
          </span>
          {/* Shut with an answer in it is the one state that has to speak for
            itself, because the answer is money. */}
          {!open && value && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {nameFor(value.reason)} · {players[value.seat]} pays
            </span>
          )}
        </span>
        <Chevron open={open} />
      </button>

      <div id={panelId} hidden={!open} className="flex flex-col gap-2">
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
                {nameFor(reason)}
              </button>
            );
          })}
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
            <h3 className="text-sm font-semibold">Who pays?</h3>
            <div className="grid grid-cols-3 gap-2">
              {pickableSeats(winnerSeat).map((seat) => (
                <TileChoice
                  key={seat}
                  selected={value?.seat === seat}
                  accent={seatSolid(seat)}
                  onClick={() => onChange({ reason: chosen, seat })}
                >
                  <Wind
                    wind={SEAT_WINDS[seat]}
                    className="text-sm leading-none"
                  />
                  <span className="w-full truncate text-xs font-semibold">
                    {players[seat]}
                  </span>
                </TileChoice>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {romanOf('baau')}: they pay what all three would have paid, and
              the winner collects the same either way. Tap {nameFor(chosen)}{' '}
              again if nobody does.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** Everyone but the winner, who can never be liable for their own hand. */
function pickableSeats(winnerSeat: Seat): Seat[] {
  return SEATS.filter((seat) => seat !== winnerSeat);
}

/** The reason in the words the rest of the app uses for it. */
function nameFor(reason: string): string {
  return reason === 'other' ? 'Other' : glossOf(reason);
}

/** Turns over to say which way the row will go, at the header icons' weight. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className="shrink-0 transition-transform"
      style={{
        color: 'var(--muted)',
        transform: open ? 'rotate(180deg)' : undefined,
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
