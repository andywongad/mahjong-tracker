import { replay } from '@/lib/scoring';
import { formatGameDate } from './format';
import type { GameRecord } from './types';

export interface SettleEntry {
  /** Lowercased name, used to group the same player across games. */
  key: string;
  name: string;
  /** Net points across the selected games. */
  points: number;
  /** Net money in whole cents, or null when no game had a stake. */
  cents: number | null;
}

export interface Transfer {
  from: string;
  to: string;
  /** Amount in the unit being settled. */
  points: number;
  cents: number | null;
}

export interface Settlement {
  players: SettleEntry[];
  transfers: Transfer[];
  currency: string;
  /** True when at least one selected game had a stake set. */
  hasMoney: boolean;
  /** True when the selected games disagree about the currency. */
  mixedCurrency: boolean;
  gameCount: number;
  handCount: number;
}

/** A stake written the way money is written, so 0.5 reads as $0.50. */
export function formatStake(baseUnit: number, currency: string): string {
  return `${currency}${baseUnit.toFixed(2)}`;
}

/** Money is held in cents so repeated addition cannot drift. */
function toCents(points: number, baseUnit: number): number {
  return Math.round(points * baseUnit * 100);
}

export function formatMoney(cents: number, currency: string): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const part = absolute % 100;
  const amount = part === 0 ? `${whole}` : `${whole}.${String(part).padStart(2, '0')}`;
  return `${sign}${currency}${amount}`;
}

/**
 * Net every player across the selected games, then work out who hands money to
 * whom.
 *
 * Transfers settle in money when any game has a stake, since that is what
 * actually changes hands; otherwise they settle in points.
 */
export function settle(games: GameRecord[]): Settlement {
  const entries = new Map<string, SettleEntry>();
  const currencies = new Set<string>();
  let hasMoney = false;
  let handCount = 0;

  // Oldest first, so the newest spelling of a name is the one kept.
  const ordered = [...games].sort((a, b) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date),
  );

  for (const game of ordered) {
    const result = replay(game);
    handCount += result.handCount;
    const { baseUnit, currency } = game.rules;
    if (baseUnit > 0) {
      hasMoney = true;
      currencies.add(currency);
    }

    game.players.forEach((rawName, seat) => {
      const name = rawName.trim();
      const key = name.toLowerCase();
      if (key === '') return;

      const points = result.scores[seat];
      const existing = entries.get(key) ?? { key, name, points: 0, cents: null };
      const cents =
        baseUnit > 0 ? (existing.cents ?? 0) + toCents(points, baseUnit) : existing.cents;

      entries.set(key, { key, name, points: existing.points + points, cents });
    });
  }

  const players = [...entries.values()].sort(
    (a, b) => (b.cents ?? b.points) - (a.cents ?? a.points) || a.name.localeCompare(b.name),
  );

  return {
    players,
    transfers: transfersFor(players, hasMoney),
    currency: currencies.size === 1 ? [...currencies][0] : '$',
    hasMoney,
    mixedCurrency: currencies.size > 1,
    gameCount: games.length,
    handCount,
  };
}

/**
 * Largest debtor pays the largest creditor, repeatedly.
 *
 * Each step settles at least one person completely, so four players never need
 * more than three payments, which is the point: fewer transfers at the table.
 */
function transfersFor(players: SettleEntry[], useMoney: boolean): Transfer[] {
  const amountOf = (entry: SettleEntry) =>
    useMoney ? (entry.cents ?? 0) : entry.points;

  const creditors = players
    .filter((player) => amountOf(player) > 0)
    .map((player) => ({ name: player.name, left: amountOf(player) }))
    .sort((a, b) => b.left - a.left);

  const debtors = players
    .filter((player) => amountOf(player) < 0)
    .map((player) => ({ name: player.name, left: -amountOf(player) }))
    .sort((a, b) => b.left - a.left);

  const transfers: Transfer[] = [];
  let c = 0;
  let d = 0;

  while (c < creditors.length && d < debtors.length) {
    const creditor = creditors[c];
    const debtor = debtors[d];
    const amount = Math.min(creditor.left, debtor.left);

    if (amount > 0) {
      transfers.push({
        from: debtor.name,
        to: creditor.name,
        points: useMoney ? 0 : amount,
        cents: useMoney ? amount : null,
      });
    }

    creditor.left -= amount;
    debtor.left -= amount;
    if (creditor.left === 0) c += 1;
    if (debtor.left === 0) d += 1;
  }

  return transfers;
}

/** Plain text for pasting into a group chat. */
export function settlementText(games: GameRecord[], settlement: Settlement): string {
  const lines: string[] = [];

  const dates = [...new Set(games.map((game) => formatGameDate(game.date)))];
  lines.push(
    dates.length === 1
      ? `Mahjong, ${dates[0]}`
      : `Mahjong, ${dates[dates.length - 1]} to ${dates[0]}`,
  );
  if (settlement.gameCount > 1) {
    lines.push(`${settlement.gameCount} games, ${settlement.handCount} hands`);
  }
  lines.push('');

  for (const player of settlement.players) {
    const points = player.points > 0 ? `+${player.points}` : `${player.points}`;
    const money =
      player.cents !== null
        ? `  ${formatMoney(player.cents, settlement.currency)}`
        : '';
    lines.push(`${player.name}  ${points}${money}`);
  }

  if (settlement.transfers.length > 0) {
    lines.push('');
    for (const transfer of settlement.transfers) {
      const amount =
        transfer.cents !== null
          ? formatMoney(transfer.cents, settlement.currency)
          : `${transfer.points}`;
      lines.push(`${transfer.from} pays ${transfer.to} ${amount}`);
    }
  }

  return lines.join('\n');
}
