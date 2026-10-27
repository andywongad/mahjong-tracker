import { SEATS, type BySeat, type Seat, type Wind } from '@/lib/scoring';
import { WIND_CHARS } from '@/lib/scoring';
import { formatSigned } from '@/components/ui/Score';

/**
 * The running score after every hand, as numbers.
 *
 * A chart is for the shape of a game; when you want the actual figure at hand
 * eleven, you want a table. This is also the table view the chart needs to be
 * readable without seeing it at all.
 */
export function ScoreTable({
  series,
  players,
  rounds = [],
}: {
  series: BySeat<number[]>;
  players: BySeat<string>;
  rounds?: Wind[];
}) {
  const handCount = series[0].length - 1;
  const hands = Array.from({ length: handCount }, (_, index) => index + 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Running score after each hand, by player
        </caption>
        <thead>
          <tr style={{ color: 'var(--muted)' }}>
            {/* Stays put while the player columns scroll, so a row never
              loses the hand it belongs to. */}
            <th
              scope="col"
              className="sticky left-0 z-10 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap"
              style={{ background: 'var(--tile-face)' }}
            >
              Hand
            </th>
            {SEATS.map((seat: Seat) => (
              <th
                key={seat}
                scope="col"
                className="px-1.5 py-2 text-right text-xs font-semibold whitespace-nowrap"
              >
                {/* No colour dot: the legend directly above this table maps
                  every colour to the same name, and the width it costs is the
                  difference between four columns fitting on a phone or not. */}
                {players[seat]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hands.map((hand) => (
            <tr key={hand} style={{ borderTop: '1px solid var(--line)' }}>
              <th
                scope="row"
                className="sticky left-0 z-10 px-2 py-1.5 text-left font-normal whitespace-nowrap"
                style={{ background: 'var(--tile-face)' }}
              >
                <span className="tnum font-semibold">{hand}</span>
                {rounds[hand - 1] && (
                  <span
                    lang="zh-Hant"
                    className="hanzi ml-1.5 text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    {WIND_CHARS[rounds[hand - 1]]}
                  </span>
                )}
              </th>
              {SEATS.map((seat: Seat) => {
                const value = series[seat][hand];
                return (
                  <td
                    key={seat}
                    className="tnum px-1.5 py-1.5 text-right text-xs font-semibold"
                    style={{
                      color:
                        value === 0
                          ? 'var(--muted)'
                          : value > 0
                            ? 'var(--gain)'
                            : 'var(--loss)',
                    }}
                  >
                    {value === 0 ? '0' : formatSigned(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
