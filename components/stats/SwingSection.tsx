import type { PlayerStats } from '@/lib/scoring';
import { seatColor } from '@/lib/game/seats';
import { formatSigned } from '@/components/ui/Score';

/**
 * How far each player travelled, not just where they stopped.
 *
 * A final score hides the night: someone who ends level may never have moved,
 * or may have been eighty up and handed it all back. Every player is drawn on
 * one shared scale, so the bars can be compared rather than only read.
 */
export function SwingSection({ players }: { players: PlayerStats[] }) {
  const lows = players.map((player) => player.swing.low);
  const highs = players.map((player) => player.swing.high);
  const min = Math.min(...lows, 0);
  const max = Math.max(...highs, 0);
  const span = Math.max(max - min, 1);
  const at = (value: number) => ((value - min) / span) * 100;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Swings</h2>
      <ul
        className="tile flex flex-col divide-y"
        style={{ borderColor: 'var(--line)' }}
      >
        {players.map((player) => {
          const { swing, score } = player;
          const colour = seatColor(player.seat);
          return (
            <li key={player.seat} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colour }}
                  />
                  <span className="truncate text-sm font-semibold">
                    {player.name}
                  </span>
                </span>
                <span
                  className="tnum shrink-0 text-sm font-bold"
                  style={{
                    color:
                      score === 0
                        ? 'var(--muted)'
                        : score > 0
                          ? 'var(--gain)'
                          : 'var(--loss)',
                  }}
                >
                  {score === 0 ? '0' : formatSigned(score)}
                </span>
              </div>

              {/* Low to high as a bar, with a mark where they finished. */}
              <div
                className="relative h-2.5 w-full rounded-full"
                style={{ background: 'var(--line)' }}
                role="img"
                aria-label={`Between ${swing.low} and ${swing.high}, finishing ${score}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${at(0)}%`,
                    background: 'var(--line-strong)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 rounded-full"
                  style={{
                    left: `${at(swing.low)}%`,
                    width: `${Math.max(at(swing.high) - at(swing.low), 1)}%`,
                    background: colour,
                    opacity: 0.55,
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${at(score)}%`,
                    background: colour,
                    border: '2px solid var(--tile-face)',
                  }}
                />
              </div>

              <div
                className="flex flex-wrap justify-between gap-x-3 text-xs"
                style={{ color: 'var(--muted)' }}
              >
                <span className="tnum">
                  Low {swing.low} · High {formatSigned(swing.high)}
                </span>
                <span className="tnum">
                  {swing.bestRun > 0 && (
                    <>
                      Best run +{swing.bestRun} from hand{' '}
                      {swing.bestRunFromHand}
                    </>
                  )}
                  {swing.gaveBack > 0 && <> · Gave back {swing.gaveBack}</>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        The bar runs from a player&rsquo;s lowest score to their highest; the
        dot is where they finished.
      </p>
    </section>
  );
}
