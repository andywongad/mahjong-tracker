'use client';

import type { ReplayResult } from '@/lib/scoring';
import type { GameRecord } from '@/lib/game/types';
import { SEATS, type Seat } from '@/lib/scoring';
import { SEAT_GRID_AREA } from '@/lib/game/seats';
import { SeatCard } from './SeatCard';
import { Wind, windLabel } from '@/components/ui/Wind';

/**
 * The table itself. Seats sit where the players sit: East at the bottom, South
 * on the right, West at the top, North on the left, with the prevailing wind and
 * hand number in the middle.
 */
export function TableSurface({
  game,
  replay,
  onSelectSeat,
  endedEarly = false,
}: {
  game: GameRecord;
  replay: ReplayResult;
  /** Tapping a seat records a hand for that player. */
  onSelectSeat?: (seat: Seat) => void;
  /** The scorekeeper called the game before the rounds ran out. */
  endedEarly?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-3 sm:p-4"
      style={{ background: 'var(--felt)' }}
    >
      <div
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateAreas: '". top ." "left center right" ". bottom ."',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr)',
        }}
      >
        {SEATS.map((seat: Seat) => (
          <div key={seat} style={{ gridArea: SEAT_GRID_AREA[seat] }}>
            <SeatCard
              seat={seat}
              name={game.players[seat]}
              score={replay.scores[seat]}
              lastDelta={replay.lastDeltas[seat]}
              isDealer={replay.currentDealerSeat === seat}
              compact
              onSelect={onSelectSeat ? () => onSelectSeat(seat) : undefined}
              selectLabel={`Record hand ${replay.handCount + 1} for ${game.players[seat]}`}
            />
          </div>
        ))}

        <div
          className="grid place-items-center text-center"
          style={{ gridArea: 'center' }}
        >
          <div
            className="grid h-full w-full place-items-center rounded-xl px-2 py-3"
            style={{ background: 'var(--felt-soft)' }}
          >
            <span style={{ color: 'var(--ink-on-felt)' }}>
              <Wind
                wind={replay.currentRound}
                className="text-4xl leading-none sm:text-5xl"
              />
            </span>
            <p
              className="mt-1 text-[0.7rem] tracking-wide uppercase"
              style={{ color: 'var(--muted-on-felt)' }}
            >
              {endedEarly
                ? 'Ended early'
                : replay.isComplete
                  ? 'Extra hands'
                  : `${windLabel(replay.currentRound)} round`}
            </p>
            <p
              className="tnum text-sm font-semibold"
              style={{ color: 'var(--ink-on-felt)' }}
            >
              Hand {replay.handCount + 1}
            </p>
            {(replay.isComplete || endedEarly) && (
              <p
                className="mt-0.5 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase"
                style={{ background: 'var(--badge-bg)', color: 'var(--on-badge)' }}
              >
                Final
              </p>
            )}
          </div>
        </div>
      </div>

      {onSelectSeat && (
        <p
          className="mt-2 text-center text-xs"
          style={{ color: 'var(--muted-on-felt)' }}
        >
          Tap whoever won to record hand {replay.handCount + 1}
        </p>
      )}
    </div>
  );
}
