'use client';

import { useMemo } from 'react';
import {
  faanValues,
  replay,
  stats,
  type PlayerStats,
  type Seat,
  type StatsTotals,
} from '@/lib/scoring';
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';
import { useGame } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { formatGameDate } from '@/lib/game/format';
import { seatColor } from '@/lib/game/seats';
import { AppHeader, HeaderButton } from '@/components/ui/AppHeader';
import { formatSigned } from '@/components/ui/Score';
import { formatMoney } from '@/lib/game/settle';
import { Term } from '@/components/ui/Term';
import { ScoreChart } from './ScoreChart';

export function StatsScreen({ gameId }: { gameId: string }) {
  const { game, loading } = useGame(gameId);
  const { go } = useNavigation();

  const result = useMemo(() => (game ? replay(game) : null), [game]);
  const summary = useMemo(() => (game ? stats(game) : null), [game]);

  if (loading) {
    return <p className="p-6 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>;
  }

  if (!game || !result || !summary) {
    return (
      <div className="p-6">
        <p className="text-sm">That game is not on this device.</p>
        <button
          type="button"
          onClick={() => go('games', null)}
          className="mt-3 inline-block text-sm underline"
        >
          Back to games
        </button>
      </div>
    );
  }

  return (
    <>
      <AppHeader
        title="Stats"
        subtitle={`${formatGameDate(game.date)} · ${result.handCount} hands`}
        back={{ onClick: () => go('table'), label: 'Table' }}
        actions={<HeaderButton onClick={() => go('settle')}>Current tally</HeaderButton>}
      />

      <main id="main" tabIndex={-1} className="flex flex-col gap-6 px-4 py-4 pad-safe-bottom">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Summary</h2>
          <div className="tile overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Summary of this game by player</caption>
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold">Player</th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">Wins</th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
<Term id="zi_mo">
                      <span className="flex flex-col items-end leading-none">
                        <span lang="zh-Hant" className="hanzi" aria-hidden="true">自摸</span>
                        <span className="mt-0.5 text-[0.6rem] leading-none font-normal">Self pick</span>
                      </span>
                    </Term>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
<Term id="cheut_chung">
                      <span className="flex flex-col items-end leading-none">
                        <span lang="zh-Hant" className="hanzi" aria-hidden="true">出銃</span>
                        <span className="mt-0.5 text-[0.6rem] leading-none font-normal">Deal in</span>
                      </span>
                    </Term>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
<Term id="zaa_wu">
                      <span className="flex flex-col items-end leading-none">
                        <span lang="zh-Hant" className="hanzi" aria-hidden="true">詐糊</span>
                        <span className="mt-0.5 text-[0.6rem] leading-none font-normal">False win</span>
                      </span>
                    </Term>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">
                    <Term id="baau_paang">High hand</Term>
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                {summary.players.map((player) => (
                  <tr key={player.seat} style={{ borderTop: '1px solid var(--line)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: seatColor(player.seat) }}
                        />
                        <span className="font-semibold">{player.name}</span>
                      </span>
                    </th>
                    <td className="tnum px-2 py-2 text-right">{player.wins}</td>
                    <td className="tnum px-2 py-2 text-right">{player.ziMo}</td>
                    <td className="tnum px-2 py-2 text-right">{player.ceotCung}</td>
                    <td className="tnum px-2 py-2 text-right">{player.zaaWu}</td>
                    <td className="tnum px-2 py-2 text-right">{player.biggestHand}</td>
                    <td
                      className="tnum px-3 py-2 text-right font-bold"
                      style={{ color: player.score >= 0 ? 'var(--gain)' : 'var(--loss)' }}
                    >
                      {formatSigned(player.score)}
                      {game.rules.baseUnit > 0 && (
                        <span
                          className="block text-[0.7rem] font-normal"
                          style={{ color: 'var(--muted)' }}
                        >
                          {formatMoney(
                            Math.round(player.score * game.rules.baseUnit * 100),
                            game.rules.currency,
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--line-strong)' }}>
                  <td className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                    All
                  </td>
                  <td className="tnum px-2 py-2 text-right font-semibold">
                    {summary.totals.wins}
                  </td>
                  <td className="tnum px-2 py-2 text-right font-semibold">
                    {summary.totals.ziMo}
                  </td>
                  <td className="tnum px-2 py-2 text-right font-semibold">
                    {summary.totals.ceotCung}
                  </td>
                  <td className="tnum px-2 py-2 text-right font-semibold">
                    {summary.totals.zaaWu}
                  </td>
                  <td className="px-2 py-2" />
                  <td className="tnum px-3 py-2 text-right font-bold">
                    {summary.totals.score}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Audit totals={summary.totals} handCount={result.handCount} />
        </section>

        <FormSection players={summary.players} />

        <PatternSection players={summary.players} />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Running score</h2>
          <div className="tile px-3 py-3">
            <ScoreChart series={result.series} players={game.players} />
          </div>
        </section>

        <ByFaanTable
          title="Wins by faan"
          values={faanValues(game.rules)}
          players={summary.players.map((player) => ({
            seat: player.seat,
            name: player.name,
            tally: player.winsByFaan,
            total: player.wins,
          }))}
        />

        <ByFaanTable
          title="Dealt in by faan"
          values={faanValues(game.rules)}
          players={summary.players.map((player) => ({
            seat: player.seat,
            name: player.name,
            tally: player.dealtInByFaan,
            total: player.ceotCung,
          }))}
        />
      </main>
    </>
  );
}

/**
 * The check the group kept at the bottom of their spreadsheet: every hand
 * explained by one outcome, and the four scores cancelling out. It is quietly
 * reassuring when it holds, and worth noticing when it does not.
 */
function Audit({
  totals,
  handCount,
}: {
  totals: StatsTotals;
  handCount: number;
}) {
  const parts = [
    `${totals.ziMo} self drawn`,
    `${totals.ceotCung} on a discard`,
    ...(totals.zaaWu > 0 ? [`${totals.zaaWu} false`] : []),
    ...(totals.draws > 0 ? [`${totals.draws} drawn`] : []),
  ];

  return (
    <p
      className="px-1 text-xs"
      style={{ color: totals.reconciles ? 'var(--muted)' : 'var(--accent)' }}
      role="status"
    >
      {totals.reconciles ? (
        <>
          Audit: {parts.join(', ')}, accounting for all {handCount}{' '}
          {handCount === 1 ? 'hand' : 'hands'}. Scores cancel out.
        </>
      ) : (
        <>
          Audit: {totals.accountedFor} of {handCount} hands accounted for, scores sum
          to {totals.score}. Something is off.
        </>
      )}
    </p>
  );
}

/** Percentages read better than long decimals on a phone. */
function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * The second block of stats, kept below the summary so the main view stays
 * scannable.
 */
function FormSection({ players }: { players: PlayerStats[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Form</h2>
      <div className="tile overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Win rates, streaks and dealer holds</caption>
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold">
                Player
              </th>
              <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">
                Win rate
              </th>
              <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">
                Best run
              </th>
              <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
                <Term id="cheut_chung">
                  <span className="flex flex-col items-end leading-none">
                    <span lang="zh-Hant" className="hanzi" aria-hidden="true">出銃</span>
                    <span className="mt-0.5 text-[0.6rem] leading-none font-normal">
                      Deal in rate
                    </span>
                  </span>
                </Term>
              </th>
              <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
                <Term id="zong">
                  <span className="flex flex-col items-end leading-none">
                    <span lang="zh-Hant" className="hanzi" aria-hidden="true">莊</span>
                    <span className="mt-0.5 text-[0.6rem] leading-none font-normal">
                      Dealer wins
                    </span>
                  </span>
                </Term>
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap">
                <Term id="zi_mo">
                  <span className="flex flex-col items-end leading-none">
                    <span lang="zh-Hant" className="hanzi" aria-hidden="true">自摸</span>
                    <span className="mt-0.5 text-[0.6rem] leading-none font-normal">
                      Self pick share
                    </span>
                  </span>
                </Term>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.seat} style={{ borderTop: '1px solid var(--line)' }}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: seatColor(player.seat) }}
                    />
                    <span className="font-semibold">{player.name}</span>
                  </span>
                </th>
                <td className="tnum px-2 py-2 text-right">{percent(player.winRate)}</td>
                <td className="tnum px-2 py-2 text-right">{player.longestWinStreak}</td>
                <td className="tnum px-2 py-2 text-right">{percent(player.ceotCungRate)}</td>
                <td className="tnum px-2 py-2 text-right">{player.dealerHolds}</td>
                <td className="tnum px-3 py-2 text-right">
                  {player.wins > 0 ? percent(player.ziMoShare) : '·'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Only worth showing once somebody has used the hand builder. */
function PatternSection({ players }: { players: PlayerStats[] }) {
  const withPatterns = players.filter(
    (player) => Object.keys(player.patternCounts).length > 0,
  );
  if (withPatterns.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Patterns</h2>
      <ul className="flex flex-col gap-2">
        {withPatterns.map((player) => {
          const top = Object.entries(player.patternCounts)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 3);
          return (
            <li key={player.seat} className="tile px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: seatColor(player.seat) }}
                />
                {player.name}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {top.map(([id, count]) => (
                  <span key={id}>
                    <Term id={`pattern:${id}`}>
                      {PATTERNS_BY_ID[id]?.nameEn ?? id}
                    </Term>
                    <span className="tnum" style={{ color: 'var(--muted)' }}>
                      {' '}
                      &times;{count}
                    </span>
                  </span>
                ))}
              </p>
              {player.signatureHand && (
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  Best built hand: {player.signatureHand.faan} faan
                  {player.signatureHand.isLimit ? ', a limit hand' : ''}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ByFaanTable({
  title,
  values,
  players,
}: {
  title: string;
  values: number[];
  players: {
    seat: Seat;
    name: string;
    tally: Record<number, number>;
    total: number;
  }[];
}) {
  // Only show faan values that actually came up, so the table stays narrow.
  // A value outside the current rules can still appear on an older hand.
  const seen = new Set<number>(values);
  for (const player of players) {
    for (const [faan, count] of Object.entries(player.tally)) {
      if (count > 0) seen.add(Number(faan));
    }
  }
  const columns = [...seen]
    .filter((faan) => players.some((player) => (player.tally[faan] ?? 0) > 0))
    .sort((a, b) => a - b);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {columns.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Nothing to show yet.
        </p>
      ) : (
        <div className="tile overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold">Player</th>
                {columns.map((faan) => (
                  <th
                    key={faan}
                    scope="col"
                    className="tnum px-2 py-2 text-right text-xs font-semibold"
                  >
                    {faan}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold">All</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.seat} style={{ borderTop: '1px solid var(--line)' }}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: seatColor(player.seat) }}
                      />
                      <span className="font-semibold">{player.name}</span>
                    </span>
                  </th>
                  {columns.map((faan) => (
                    <td
                      key={faan}
                      className="tnum px-2 py-2 text-right"
                      style={
                        (player.tally[faan] ?? 0) === 0
                          ? { color: 'var(--muted)' }
                          : undefined
                      }
                    >
                      {player.tally[faan] || '·'}
                    </td>
                  ))}
                  <td className="tnum px-3 py-2 text-right font-bold">{player.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
