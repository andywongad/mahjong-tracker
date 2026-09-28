import { describe, expect, it } from 'vitest';
import { formatMoney, settle, settlementText } from '../settle';
import type { GameRecord } from '../types';
import { OUR_TABLE, type Rules } from '@/lib/rules/types';
import type { Hand, PlayerNames, Seat } from '@/lib/scoring';

let counter = 0;

function makeGame(
  players: PlayerNames,
  hands: readonly Hand[],
  date = '2026-01-01',
  rules: Rules = OUR_TABLE,
): GameRecord {
  counter += 1;
  return {
    id: `game-${counter}`,
    date,
    players,
    rules,
    shareSlug: `slug-${counter}`,
    hands: hands.map((hand, index) => ({ ...hand, id: `h-${index}`, seq: index })),
    createdAt: `2026-01-01T00:00:${String(counter).padStart(2, '0')}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const ziMo = (winnerSeat: Seat, faan = 3): Hand => ({ type: 'zi_mo', winnerSeat, faan });
const FOUR: PlayerNames = ['Player A', 'Player B', 'Player C', 'Player D'];
const staked = (baseUnit: number): Rules => ({ ...OUR_TABLE, baseUnit, currency: '$' });

describe('netting', () => {
  it('nets a single game to zero', () => {
    const result = settle([makeGame(FOUR, [ziMo(0, 3)])]);
    expect(result.players.reduce((a, p) => a + p.points, 0)).toBe(0);
  });

  it('adds a player up across several games', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-01'),
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-02'),
    ]);
    expect(result.players.find((p) => p.key === 'player a')?.points).toBe(36);
    expect(result.gameCount).toBe(2);
    expect(result.handCount).toBe(2);
  });

  it('groups the same player across games regardless of case', () => {
    const result = settle([
      makeGame(['Player C', 'Player B', 'Player A', 'Player D'], [ziMo(0, 3)], '2026-01-01'),
      makeGame([' player c ', 'Player B', 'Player A', 'Player D'], [ziMo(0, 3)], '2026-01-02'),
    ]);
    expect(result.players.filter((p) => p.key === 'player c')).toHaveLength(1);
    expect(result.players.find((p) => p.key === 'player c')?.points).toBe(36);
  });

  it('handles a player who only appears in some games', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-01'),
      makeGame(['Player A', 'Player B', 'Player C', 'Player E'], [ziMo(0, 3)], '2026-01-02'),
    ]);
    expect(result.players.map((p) => p.key).sort()).toEqual([
      'player a',
      'player b',
      'player c',
      'player d',
      'player e',
    ]);
    expect(result.players.reduce((a, p) => a + p.points, 0)).toBe(0);
  });
});

describe('transfers', () => {
  it('settles one winner and three losers in three payments', () => {
    const result = settle([makeGame(FOUR, [ziMo(0, 3)])]);
    expect(result.transfers).toHaveLength(3);
    expect(result.transfers.every((t) => t.to === 'Player A')).toBe(true);
    expect(result.transfers.reduce((a, t) => a + t.points, 0)).toBe(18);
  });

  it('never needs more transfers than players minus one', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 5), ziMo(1, 3), ziMo(2, 4)], '2026-01-01'),
    ]);
    expect(result.transfers.length).toBeLessThanOrEqual(3);
  });

  it('pays every debt and every credit exactly', () => {
    const result = settle([makeGame(FOUR, [ziMo(0, 5), ziMo(2, 3)])]);
    for (const player of result.players) {
      const paid = result.transfers
        .filter((t) => t.from === player.name)
        .reduce((a, t) => a + t.points, 0);
      const received = result.transfers
        .filter((t) => t.to === player.name)
        .reduce((a, t) => a + t.points, 0);
      expect(received - paid).toBe(player.points);
    }
  });

  it('produces no transfers when everyone is level', () => {
    const result = settle([makeGame(FOUR, [])]);
    expect(result.transfers).toEqual([]);
  });

  it('matches the largest debtor with the largest creditor first', () => {
    const result = settle([makeGame(FOUR, [ziMo(0, 6), ziMo(0, 3)])]);
    // Player A is owed by all three equally, so the first transfer is a full one.
    expect(result.transfers[0].to).toBe('Player A');
  });
});

describe('money', () => {
  it('stays in points when no game has a stake', () => {
    const result = settle([makeGame(FOUR, [ziMo(0, 3)])]);
    expect(result.hasMoney).toBe(false);
    expect(result.players.every((p) => p.cents === null)).toBe(true);
    expect(result.transfers.every((t) => t.cents === null)).toBe(true);
  });

  it('converts points to money at the game stake', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-01', staked(0.5)),
    ]);
    expect(result.hasMoney).toBe(true);
    // Player A is +18 points at 50 cents a point.
    expect(result.players.find((p) => p.key === 'player a')?.cents).toBe(900);
  });

  it('uses each game its own stake when settling a whole night', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-01', staked(0.5)),
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-02', staked(1)),
    ]);
    // 18 points at 50c, then 18 points at a dollar.
    expect(result.players.find((p) => p.key === 'player a')?.cents).toBe(900 + 1800);
  });

  it('nets money to zero', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 5), ziMo(2, 3)], '2026-01-01', staked(0.25)),
    ]);
    expect(result.players.reduce((a, p) => a + (p.cents ?? 0), 0)).toBe(0);
  });

  it('settles transfers in money once a stake exists', () => {
    const result = settle([
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-01', staked(0.5)),
    ]);
    expect(result.transfers.every((t) => t.cents !== null)).toBe(true);
    expect(result.transfers.reduce((a, t) => a + (t.cents ?? 0), 0)).toBe(900);
  });

  it('flags a night where the games disagree about currency', () => {
    const pounds: Rules = { ...OUR_TABLE, baseUnit: 1, currency: '£' };
    const result = settle([
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-01', staked(1)),
      makeGame(FOUR, [ziMo(0, 3)], '2026-01-02', pounds),
    ]);
    expect(result.mixedCurrency).toBe(true);
  });
});

describe('formatMoney', () => {
  it.each([
    [900, '$9'],
    [950, '$9.50'],
    [905, '$9.05'],
    [-1250, '-$12.50'],
    [0, '$0'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatMoney(cents, '$')).toBe(expected);
  });
});

describe('summary text', () => {
  it('reads cleanly for a single game', () => {
    const games = [makeGame(FOUR, [ziMo(0, 3)], '2026-08-19', staked(0.5))];
    const text = settlementText(games, settle(games));
    expect(text).toContain('Mahjong, Aug 19, 2026');
    expect(text).toContain('Player A  +18  $9');
    expect(text).toMatch(/pays Player A \$3/);
  });

  it('names the span and totals for a whole night', () => {
    const games = [
      makeGame(FOUR, [ziMo(0, 3)], '2026-08-19'),
      makeGame(FOUR, [ziMo(1, 3)], '2026-08-20'),
    ];
    const text = settlementText(games, settle(games));
    expect(text).toContain('2 games, 2 hands');
  });

  it('is plain text with no markup', () => {
    const games = [makeGame(FOUR, [ziMo(0, 3)], '2026-08-19', staked(1))];
    const text = settlementText(games, settle(games));
    expect(text).not.toMatch(/[<>*_`|]/);
  });
});
