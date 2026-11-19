'use client';

import { useId, useState } from 'react';
import { SEATS, type Liability, type PlayerNames, type Seat } from '@/lib/scoring';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { Wind } from '@/components/ui/Wind';
import { TileChoice } from '@/components/ui/TileChoice';
import { definitionOf, glossOf, romanOf } from '@/lib/terms';

/**
 * 包: somebody paying what the whole table would have paid.
 *
 * Asked before how the hand was won, because at the table it is known at the
 * same moment the winner is: somebody says "that's your twelfth tile" and the
 * room already knows who is paying. Everything about it lives in one box, so
 * a question with four parts reads as one question.
 *
 * Folded away by default. Most hands are not one of these, and a beginner
 * asked on every hand whether anybody completed a fourth exposed set of one
 * suit from their discard would learn to tap past the question rather than
 * read it. A table that plays none of these rules never sees the row at all.
 *
 * A plain disclosure: one header opens and closes it, in one place, chevron
 * turning over. Closing is not cancelling, so the header carries the answer
 * when it is shut, because a folded row hiding a decision about money would
 * be a place to lose one.
 *
 * The names are the examples. A table that has not said which of these it
 * plays sees all of them, because one name on its own says nothing about
 * what the question covers, and a name is no use to anybody who does not
 * know the rule behind it. So tapping one both chooses it and explains it:
 * the definition is the same sentence the glossary carries, and the chip
 * cannot open the glossary itself without putting a button inside a button.
 *
 * Sitting above the hand type costs it two things it used to lean on, and
 * both are handled rather than left to misfire. The note about 12 Pieces
 * being a self draw rule waits until there is a hand type to judge. And the
 * payer can no longer be assumed to be whoever fed the tile, because nobody
 * has said yet that anyone did: a reason chosen with no shooter known waits
 * for a tap rather than guessing a seat and being quietly wrong.
 */
export function PaysForTheTable({
  players,
  reasons,
  winnerSeat,
  discarderSeat,
  handType,
  value,
  onChange,
}: {
  players: PlayerNames;
  /** Reason ids this table plays, in the order they are offered. */
  reasons: string[];
  winnerSeat: Seat;
  /** Known on an edit, and on a new hand only once the shooter is picked. */
  discarderSeat: Seat | null;
  /** Null until the hand has been said to be a discard win or a self draw. */
  handType: 'ceot_cung' | 'zi_mo' | null;
  value: Liability | undefined;
  onChange: (liability: Liability | undefined) => void;
}) {
  const [open, setOpen] = useState(Boolean(value));
  /** A reason chosen while there was nobody obvious to pin it on yet. */
  const [waiting, setWaiting] = useState<string | null>(null);
  const panelId = useId();
  if (reasons.length === 0) return null;

  const chosen = value?.reason ?? waiting;

  function pick(reason: string) {
    // A chosen reason tapped again is how to say nobody after all, which is
    // what everything else on this screen that can be on or off does.
    if (chosen === reason) {
      setWaiting(null);
      onChange(undefined);
      return;
    }
    const known =
      value?.seat ??
      (discarderSeat !== null && discarderSeat !== winnerSeat
        ? discarderSeat
        : null);
    if (known === null) {
      setWaiting(reason);
      onChange(undefined);
      return;
    }
    setWaiting(null);
    onChange({ reason, seat: known });
  }

  function payer(seat: Seat) {
    if (!chosen) return;
    setWaiting(null);
    onChange({ reason: chosen, seat });
  }

  const offered = [...reasons, 'other'];

  return (
    <section className="tile-sm flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="touch flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">
            Someone pays for the table?{' '}
            <span lang="zh-Hant" className="hanzi">
              包
            </span>
          </span>
          {!open && value && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {nameFor(value.reason)} · {players[value.seat]} pays
            </span>
          )}
        </span>
        <Chevron open={open} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="flex flex-col gap-2 px-3 pt-1 pb-3"
      >
        <div className="flex flex-wrap gap-2">
          {offered.map((reason) => {
            const on = chosen === reason;
            return (
              <button
                key={reason}
                type="button"
                aria-pressed={on}
                onClick={() => pick(reason)}
                className="touch rounded-pill px-3 text-sm font-semibold"
                style={
                  on
                    ? { background: 'var(--tile-back)', color: '#fff' }
                    : {
                        background: 'var(--surface)',
                        border: '1px solid var(--line-strong)',
                        color: 'var(--ink)',
                      }
                }
              >
                {nameFor(reason)}
              </button>
            );
          })}
        </div>

        {/* What the name on the chip actually means. Shown on choosing it,
          because the chip is already a button and cannot hold another one,
          and because the moment somebody wants the rule explained is the
          moment they are deciding whether it is the one that happened. */}
        {chosen && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {chosen === 'other'
              ? 'Anything your table plays that is not on this list. The money moves the same way: whoever you pick pays what all three would have paid.'
              : definitionOf(chosen)}
          </p>
        )}

        {/* Waits for a hand type rather than guessing at one, because this
          row is now asked before anybody has said how the hand was won. */}
        {chosen === 'twelve_pieces' && handType === 'ceot_cung' && (
          <p className="text-xs" style={{ color: 'var(--accent)' }}>
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
                  onClick={() => payer(seat)}
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
              {value
                ? `${romanOf('baau')}: they pay what all three would have paid, and the winner collects the same either way. Tap ${nameFor(chosen)} again if nobody does.`
                : 'Nothing is counted until you say who pays.'}
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
