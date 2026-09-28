'use client';

import { useMemo, useState } from 'react';
import { SEATS, type Seat } from '@/lib/scoring';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { standings, summarise } from '@/lib/game/standings';
import { formatGameDate } from '@/lib/game/format';
import { seatColor } from '@/lib/game/seats';
import type { GameRecord } from '@/lib/game/types';
import { AppHeader } from '@/components/ui/AppHeader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { GameSheet } from '@/components/sheets/GameSheet';
import { formatSigned } from '@/components/ui/Score';
import { formatMoney } from '@/lib/game/settle';
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';

export function GamesScreen() {
  const { games, loading, createGame, updateGame, deleteGame } = useGames();
  const { go } = useNavigation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GameRecord | null>(null);

  const summaries = useMemo(() => summarise(games), [games]);
  const table = useMemo(() => standings(games), [games]);

  return (
    <>
      <AppHeader
        title="Games"
        subtitle={
          games.length === 0
            ? 'No games yet'
            : `${games.length} game${games.length === 1 ? '' : 's'}`
        }
        actions={<ThemeToggle />}
      />

      <main id="main" tabIndex={-1} className="flex flex-col gap-6 px-4 py-4 pad-safe-bottom">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
          className="tile-pressable touch w-full rounded-xl py-4 text-base font-semibold"
          style={{ background: 'var(--tile-back)', color: '#fff', boxShadow: '0 3px 0 #0e4a38' }}
        >
          Start a new game
        </button>

        <div className="flex gap-2">
          {games.length > 0 && (
            <button
              type="button"
              onClick={() => go('settle', null)}
              className="tile-sm tile-pressable touch flex-1 rounded-xl py-3 text-sm font-semibold"
            >
              Settle up
            </button>
          )}
          <button
            type="button"
            onClick={() => go('glossary', null)}
            className="tile-sm tile-pressable touch flex-1 rounded-xl py-3 text-sm font-semibold"
          >
            Glossary
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">History</h2>
            {summaries.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Tap a game to record hands
              </p>
            )}
          </div>
          {loading && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Loading…
            </p>
          )}
          {!loading && summaries.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Start a game and it will show up here.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {summaries.map((summary) => (
              <li key={summary.id} className="tile relative">
                {/* The whole card opens the game, which is where hands are
                    recorded. Settings is a separate, smaller action so the two
                    are not mistaken for each other. */}
                <button
                  type="button"
                  onClick={() => go('table', summary.id)}
                  className="touch w-full px-3 py-2.5 text-left"
                >
                  <span className="flex items-baseline gap-2 pr-20">
                    <span className="text-sm font-semibold">
                      {formatGameDate(summary.date)}
                    </span>
                    {summary.isComplete && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase"
                        style={{ background: 'var(--badge-bg)', color: 'var(--on-badge)' }}
                      >
                        Final
                      </span>
                    )}
                    <span className="tnum text-xs" style={{ color: 'var(--muted)' }}>
                      {summary.handCount} {summary.handCount === 1 ? 'hand' : 'hands'}
                    </span>
                  </span>

                  <span className="mt-2 grid grid-cols-4 gap-2">
                    {SEATS.map((seat: Seat) => (
                      <span key={seat} className="block min-w-0">
                        <span className="flex items-center gap-1">
                          <span
                            aria-hidden="true"
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: seatColor(seat) }}
                          />
                          <span
                            className="block truncate text-[0.7rem]"
                            style={{ color: 'var(--muted)' }}
                          >
                            {summary.players[seat]}
                          </span>
                        </span>
                        <span
                          className="tnum block text-sm font-bold"
                          style={{
                            color:
                              summary.scores[seat] === 0
                                ? 'var(--muted)'
                                : summary.scores[seat] > 0
                                  ? 'var(--gain)'
                                  : 'var(--loss)',
                          }}
                        >
                          {formatSigned(summary.scores[seat])}
                        </span>
                        {summary.baseUnit > 0 && (
                          <span
                            className="tnum block text-[0.7rem]"
                            style={{ color: 'var(--muted)' }}
                          >
                            {formatMoney(
                              Math.round(summary.scores[seat] * summary.baseUnit * 100),
                              summary.currency,
                            )}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const game = games.find((candidate) => candidate.id === summary.id);
                    if (!game) return;
                    setEditing(game);
                    setSheetOpen(true);
                  }}
                  className="absolute top-0.5 right-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  Settings
                </button>
              </li>
            ))}
          </ul>
        </section>

        {table.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">All time standings</h2>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Scroll the table sideways for the full picture.
            </p>
            <div className="tile overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">All time standings by player</caption>
                <thead>
                  <tr style={{ color: 'var(--muted)' }}>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold">Player</th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">Games</th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">Top</th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">Wins</th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
                      Win rate
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
                      <span lang="zh-Hant" className="hanzi" aria-hidden="true">自摸</span>
                      <span className="sr-only">Zi Mo</span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap">
                      <span lang="zh-Hant" className="hanzi" aria-hidden="true">出銃</span>
                      <span className="sr-only">Cheut Chung</span>
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => (
                    <tr key={row.key} style={{ borderTop: '1px solid var(--line)' }}>
                      <th scope="row" className="px-3 py-2 text-left font-semibold">
                        {row.name}
                      </th>
                      <td className="tnum px-2 py-2 text-right">{row.games}</td>
                      <td className="tnum px-2 py-2 text-right">{row.topFinishes}</td>
                      <td className="tnum px-2 py-2 text-right">{row.wins}</td>
                      <td className="tnum px-2 py-2 text-right">
                        {row.hands > 0 ? `${Math.round(row.winRate * 100)}%` : '·'}
                      </td>
                      <td className="tnum px-2 py-2 text-right">{row.ziMo}</td>
                      <td className="tnum px-2 py-2 text-right">{row.ceotCung}</td>
                      <td
                        className="tnum px-3 py-2 text-right font-bold"
                        style={{ color: row.net >= 0 ? 'var(--gain)' : 'var(--loss)' }}
                      >
                        {formatSigned(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.some((row) => row.signatureHand) && (
              <div className="tile flex flex-col gap-1.5 px-3 py-2.5">
                <h3 className="text-xs font-semibold">Signature hands</h3>
                {table
                  .filter((row) => row.signatureHand)
                  .map((row) => (
                    <p key={row.key} className="text-xs">
                      <span className="font-semibold">{row.name}</span>{' '}
                      <span className="tnum">{row.signatureHand?.faan} faan</span>
                      <span style={{ color: 'var(--muted)' }}>
                        {' '}
                        ·{' '}
                        {row.signatureHand?.patterns
                          .map(
                            (pattern) =>
                              `${PATTERNS_BY_ID[pattern.id]?.nameEn ?? pattern.id}${
                                pattern.count > 1 ? ` x${pattern.count}` : ''
                              }`,
                          )
                          .join(', ')}
                      </span>
                    </p>
                  ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Keyed so the fields start from the game being edited, or from the last
          game's names for a new one, on every open. */}
      <GameSheet
        key={sheetOpen ? (editing ? editing.id : 'new') : 'closed'}
        open={sheetOpen}
        editing={editing}
        lastPlayers={games[0]?.players}
        onClose={() => setSheetOpen(false)}
        onSave={async (input) => {
          if (editing) {
            await updateGame(editing.id, input);
          } else {
            const game = await createGame(input);
            go('table', game.id);
          }
        }}
        onDelete={
          editing
            ? async () => {
                await deleteGame(editing.id);
              }
            : undefined
        }
      />
    </>
  );
}
