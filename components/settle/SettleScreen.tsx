'use client';

import { useMemo, useState } from 'react';
import { useGames } from '@/lib/game/GamesProvider';
import { useNavigation } from '@/lib/game/navigation';
import { formatGameDate } from '@/lib/game/format';
import { formatMoney, formatStake, settle, settlementText } from '@/lib/game/settle';
import { AppHeader } from '@/components/ui/AppHeader';
import { formatSigned } from '@/components/ui/Score';

/**
 * Who owes whom at the end of the night.
 *
 * Any number of games can be settled together, because a night is usually
 * several games and nobody wants to pay up three times.
 */
export function SettleScreen() {
  const { games, loading } = useGames();
  const { gameId, go } = useNavigation();

  // Arriving from a game settles that one; everything else is opt in.
  const [selected, setSelected] = useState<string[]>(() =>
    gameId ? [gameId] : games[0] ? [games[0].id] : [],
  );
  const [copied, setCopied] = useState(false);

  const chosen = useMemo(
    () => games.filter((game) => selected.includes(game.id)),
    [games, selected],
  );
  const settlement = useMemo(() => settle(chosen), [chosen]);

  function toggle(id: string) {
    setCopied(false);
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function copy() {
    const text = settlementText(chosen, settlement);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard can be refused; the text is on screen to copy by hand.
      setCopied(false);
    }
  }

  return (
    <>
      <AppHeader
        title="Who owes what"
        subtitle={
          chosen.length === 0
            ? 'Pick a game'
            : `${chosen.length} game${chosen.length === 1 ? '' : 's'}, ${settlement.handCount} hands so far`
        }
        back={{ onClick: () => go('games', null), label: 'Games' }}
      />

      <main id="main" tabIndex={-1} className="flex flex-col gap-6 px-4 py-4 pad-safe-bottom">
        {loading && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading…
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Games included</h2>
          <ul className="flex flex-col gap-2">
            {games.map((game) => {
              const on = selected.includes(game.id);
              return (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => toggle(game.id)}
                    aria-pressed={on}
                    className="tile touch flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded"
                      style={{
                        background: on ? 'var(--tile-back)' : 'transparent',
                        border: on ? 'none' : '1px solid var(--line-strong)',
                        color: '#fff',
                      }}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {formatGameDate(game.date)}
                      </span>
                      <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                        {game.players.join(' · ')}
                        {game.rules.baseUnit
                          ? ` · ${formatStake(game.rules.baseUnit, game.rules.currency)} a point`
                          : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {settlement.mixedCurrency && (
          <p
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              background: 'var(--tile-face)',
              border: '1px solid var(--accent)',
              color: 'var(--ink)',
            }}
            role="alert"
          >
            These games use different currencies, so the money below adds amounts
            that are not the same thing. Settle them separately.
          </p>
        )}

        {chosen.length > 0 && (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Where everyone stands</h2>
              <div className="tile overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Net result per player</caption>
                  <thead>
                    <tr style={{ color: 'var(--muted)' }}>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-semibold">
                        Player
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold">
                        Points
                      </th>
                      {settlement.hasMoney && (
                        <th scope="col" className="px-3 py-2 text-right text-xs font-semibold">
                          Money
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.players.map((player) => (
                      <tr key={player.key} style={{ borderTop: '1px solid var(--line)' }}>
                        <th scope="row" className="px-3 py-2 text-left font-semibold">
                          {player.name}
                        </th>
                        <td
                          className="tnum px-2 py-2 text-right font-semibold"
                          style={{
                            color:
                              player.points === 0
                                ? 'var(--muted)'
                                : player.points > 0
                                  ? 'var(--gain)'
                                  : 'var(--loss)',
                          }}
                        >
                          {formatSigned(player.points)}
                        </td>
                        {settlement.hasMoney && (
                          <td
                            className="tnum px-3 py-2 text-right font-bold"
                            style={{
                              color:
                                (player.cents ?? 0) === 0
                                  ? 'var(--muted)'
                                  : (player.cents ?? 0) > 0
                                    ? 'var(--gain)'
                                    : 'var(--loss)',
                            }}
                          >
                            {player.cents === null
                              ? '—'
                              : formatMoney(player.cents, settlement.currency)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Payments to make</h2>
              {settlement.transfers.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Everyone is level. Nothing to settle.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {settlement.transfers.map((transfer, index) => (
                    <li
                      key={`${transfer.from}-${transfer.to}-${index}`}
                      className="tile flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <span className="text-sm">
                        <span className="font-semibold">{transfer.from}</span> pays{' '}
                        <span className="font-semibold">{transfer.to}</span>
                      </span>
                      <span className="tnum text-base font-bold">
                        {transfer.cents !== null
                          ? formatMoney(transfer.cents, settlement.currency)
                          : transfer.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!settlement.hasMoney && settlement.transfers.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Settling in points. Set money per point in the game rules to settle in
                  cash.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copy}
                className="tile-pressable touch w-full rounded-xl py-4 text-base font-semibold"
                style={{
                  background: 'var(--tile-back)',
                  color: '#fff',
                  boxShadow: '0 3px 0 #0e4a38',
                }}
              >
                {copied ? 'Copied' : 'Copy summary'}
              </button>
              <p className="text-xs" style={{ color: 'var(--muted)' }} role="status">
                {copied
                  ? 'Paste it into the group chat.'
                  : 'Copies the scores and payments as plain text.'}
              </p>
              <pre
                className="tile overflow-x-auto px-3 py-2 text-xs"
                style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre' }}
              >
                {settlementText(chosen, settlement)}
              </pre>
            </section>
          </>
        )}
      </main>
    </>
  );
}
