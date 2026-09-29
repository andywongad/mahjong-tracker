'use client';

import { useMemo } from 'react';
import { SEATS, type Seat } from '@/lib/scoring';
import { formatMoney, settle } from '@/lib/game/settle';
import type { GameRecord } from '@/lib/game/types';
import { formatSigned } from '@/components/ui/Score';
import { PlayerColumns } from './PlayerColumns';

/**
 * Where everyone stands, as the bottom line of the hand log.
 *
 * Laid out on the same four columns as the hands above, in seat order, so each
 * player's total sits directly under their own name. It runs the same settle as
 * the details screen, so the two can never disagree.
 */
export function TallySummary({ game }: { game: GameRecord }) {
  const tally = useMemo(() => settle([game]), [game]);

  // settle orders by who is up; the columns have to stay in seat order.
  const bySeat = useMemo(
    () =>
      SEATS.map((seat: Seat) =>
        tally.players.find(
          (player) => player.key === game.players[seat].trim().toLowerCase(),
        ),
      ),
    [tally, game.players],
  );

  const colour = (value: number) =>
    value === 0 ? 'var(--muted)' : value > 0 ? 'var(--gain)' : 'var(--loss)';

  return (
    <div style={{ borderTop: '2px solid var(--line-strong)' }}>
      {/* The names again, so a long log reads from the bottom too. */}
      <PlayerColumns
        players={game.players}
        className="px-1 pt-2"
        style={{ background: 'var(--surface)' }}
      />

      <div
        className="flex gap-1 px-1 pt-1 pb-2"
        style={{ background: 'var(--surface)' }}
      >
        <span className="w-14 shrink-0 self-center px-1 text-center text-xs font-bold">
          Tally
        </span>

        <div className="grid flex-1 grid-cols-4 gap-1">
          {SEATS.map((seat: Seat) => {
            const player = bySeat[seat];
            const points = player?.points ?? 0;
            return (
              <span
                key={seat}
                className="flex flex-col items-end leading-tight"
              >
                <span
                  className="tnum text-sm font-bold"
                  style={{ color: colour(points) }}
                >
                  {formatSigned(points)}
                </span>
                {player?.cents != null && (
                  <span
                    className="tnum text-[0.7rem]"
                    style={{ color: colour(player.cents) }}
                  >
                    {formatMoney(player.cents, tally.currency)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
