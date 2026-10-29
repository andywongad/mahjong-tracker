import {
  SEATS,
  type FeedEntry,
  type PlayerStats,
  type Seat,
} from '@/lib/scoring';
import { glossOf } from '@/lib/terms';

/**
 * Who hands their tiles to whom.
 *
 * Deal ins are directional, and the direction is the interesting part: that
 * one player feeds another repeatedly while never being fed back is the kind
 * of thing a table argues about and cannot otherwise prove. Self drawn hands
 * appear nowhere here, because nobody fed them.
 */
export function FeedMatrix({
  players,
  feed,
}: {
  players: PlayerStats[];
  feed: FeedEntry[];
}) {
  const find = (shooter: Seat, winner: Seat) =>
    feed.find(
      (entry) => entry.shooterSeat === shooter && entry.winnerSeat === winner,
    );
  const fedTotal = (shooter: Seat) =>
    feed
      .filter((entry) => entry.shooterSeat === shooter)
      .reduce((sum, entry) => sum + entry.hands, 0);

  if (feed.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Who feeds whom</h2>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Rows are who fed, columns who won. Each cell is the{' '}
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>
          hands
        </span>{' '}
        they fed, over the <span className="font-semibold">points</span> they
        paid for them.
      </p>
      <div className="tile overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Hands each player dealt into each other player, and the points they
            paid on them
          </caption>
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th
                scope="col"
                className="sticky left-0 z-10 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap"
                style={{ background: 'var(--tile-face)' }}
              >
                {glossOf('cheut_chung')}
              </th>
              {SEATS.map((seat: Seat) => (
                <th
                  key={seat}
                  scope="col"
                  className="px-1 py-2 text-right text-xs font-semibold whitespace-nowrap"
                >
                  {players[seat].name}
                </th>
              ))}
              <th
                scope="col"
                className="px-2 py-2 text-right text-xs font-semibold"
              >
                All
              </th>
            </tr>
          </thead>
          <tbody>
            {SEATS.map((shooter: Seat) => (
              <tr key={shooter} style={{ borderTop: '1px solid var(--line)' }}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                  style={{ background: 'var(--tile-face)' }}
                >
                  {players[shooter].name}
                </th>
                {SEATS.map((winner: Seat) => {
                  if (winner === shooter) {
                    return (
                      <td
                        key={winner}
                        className="px-1 py-1.5 text-right"
                        style={{ color: 'var(--line-strong)' }}
                      >
                        &mdash;
                      </td>
                    );
                  }
                  const entry = find(shooter, winner);
                  return (
                    <td key={winner} className="px-1 py-1.5 text-right">
                      <span className="tnum text-sm font-semibold">
                        {entry ? entry.hands : '·'}
                      </span>
                      {entry && (
                        <span
                          className="tnum block text-[0.7rem] leading-tight"
                          style={{ color: 'var(--muted)' }}
                        >
                          {entry.points}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="tnum px-2 py-1.5 text-right text-sm font-bold">
                  {fedTotal(shooter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Self drawn hands are nobody&rsquo;s fault, so they are not counted here.
      </p>
    </section>
  );
}
