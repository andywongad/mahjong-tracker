import { describe, expect, it } from 'vitest';
import { standings, summarise } from '../standings';
import type { GameRecord } from '../types';
import type { Hand, PlayerNames, Seat } from '@/lib/scoring';
import { OUR_TABLE } from '@/lib/rules/types';

let counter = 0;

function makeGame(
  players: PlayerNames,
  hands: readonly Hand[],
  date = '2026-01-01',
): GameRecord {
  counter += 1;
  return {
    id: `game-${counter}`,
    date,
    players,
    rules: OUR_TABLE,
    shareSlug: `slug-${counter}`,
    hands: hands.map((hand, index) => ({
      ...hand,
      id: `h-${index}`,
      seq: index,
    })),
    createdAt: `2026-01-01T00:00:${String(counter).padStart(2, '0')}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const ziMo = (winnerSeat: Seat, faan = 3): Hand => ({
  type: 'zi_mo',
  winnerSeat,
  faan,
});

describe('standings', () => {
  it('is empty with no games', () => {
    expect(standings([])).toEqual([]);
  });

  it('groups the same player across games', () => {
    const games = [
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0)],
        '2026-01-01',
      ),
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0)],
        '2026-01-02',
      ),
    ];
    const rows = standings(games);
    expect(rows).toHaveLength(4);
    const aaron = rows.find((row) => row.key === 'player a');
    expect(aaron?.games).toBe(2);
    expect(aaron?.wins).toBe(2);
    expect(aaron?.net).toBe(36);
  });

  it('groups names without regard to case or surrounding space', () => {
    const games = [
      makeGame(
        ['Player C', 'Player B', 'Player A', 'Player D'],
        [ziMo(0)],
        '2026-01-01',
      ),
      makeGame(
        [' player c ', 'Player B', 'Player A', 'Player D'],
        [ziMo(0)],
        '2026-01-02',
      ),
      makeGame(
        ['PLAYER C', 'Player B', 'Player A', 'Player D'],
        [ziMo(0)],
        '2026-01-03',
      ),
    ];
    const rows = standings(games);
    expect(rows.filter((row) => row.key === 'player c')).toHaveLength(1);
    expect(rows.find((row) => row.key === 'player c')?.games).toBe(3);
  });

  it('keeps the most recent spelling as the display name', () => {
    const games = [
      makeGame(
        ['player c', 'Player B', 'Player A', 'Player D'],
        [],
        '2026-01-01',
      ),
      makeGame(
        ['Player C', 'Player B', 'Player A', 'Player D'],
        [],
        '2026-01-02',
      ),
    ];
    expect(standings(games).find((row) => row.key === 'player c')?.name).toBe(
      'Player C',
    );
  });

  it('counts a top finish for the highest final score', () => {
    const games = [
      makeGame(['Player A', 'Player B', 'Player C', 'Player D'], [ziMo(2)]),
    ];
    const rows = standings(games);
    expect(rows.find((row) => row.key === 'player c')?.topFinishes).toBe(1);
    expect(rows.find((row) => row.key === 'player a')?.topFinishes).toBe(0);
  });

  it('counts a top finish for everyone tied at the top', () => {
    const games = [
      makeGame(['Player A', 'Player B', 'Player C', 'Player D'], []),
    ];
    expect(standings(games).every((row) => row.topFinishes === 1)).toBe(true);
  });

  it('adds up wins, self draws, and deal ins across games', () => {
    const games = [
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [
          ziMo(0),
          { type: 'ceot_cung', winnerSeat: 0, discarderSeat: 1, faan: 4 },
        ],
      ),
      makeGame(['Player A', 'Player B', 'Player C', 'Player D'], [ziMo(0)]),
    ];
    const rows = standings(games);
    const aaron = rows.find((row) => row.key === 'player a');
    expect(aaron?.wins).toBe(3);
    expect(aaron?.ziMo).toBe(2);
    expect(rows.find((row) => row.key === 'player b')?.ceotCung).toBe(1);
  });

  it('orders by net score, best first', () => {
    const games = [
      makeGame(['Player A', 'Player B', 'Player C', 'Player D'], [ziMo(2)]),
    ];
    const rows = standings(games);
    expect(rows[0].key).toBe('player c');
    expect(rows[0].net).toBeGreaterThan(rows[1].net);
  });

  it('nets to zero across all players', () => {
    const games = [
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0), ziMo(2)],
      ),
      makeGame(['Player A', 'Player B', 'Player C', 'Player E'], [ziMo(1)]),
    ];
    const total = standings(games).reduce((acc, row) => acc + row.net, 0);
    expect(total).toBe(0);
  });

  it('ignores blank seats', () => {
    const games = [makeGame(['Player A', '', '  ', 'Player D'], [])];
    expect(
      standings(games)
        .map((row) => row.key)
        .sort(),
    ).toEqual(['player a', 'player d']);
  });
});

describe('summarise', () => {
  it('reports final scores, hand count, and completion per game', () => {
    const rows = summarise([
      makeGame(['Player A', 'Player B', 'Player C', 'Player D'], [ziMo(0, 3)]),
    ]);
    expect(rows[0].scores).toEqual([18, -6, -6, -6]);
    expect(rows[0].handCount).toBe(1);
    expect(rows[0].isComplete).toBe(false);
  });
});

describe('all time rates and patterns', () => {
  const built = (
    winnerSeat: Seat,
    faan: number,
    patterns: { id: string; count: number }[],
  ): Hand => ({ type: 'zi_mo', winnerSeat, faan, patterns });

  it('counts hands played across every game', () => {
    const rows = standings([
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0), ziMo(1)],
        '2026-01-01',
      ),
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0)],
        '2026-01-02',
      ),
    ]);
    expect(rows.find((r) => r.key === 'player a')?.hands).toBe(3);
  });

  it('computes a win rate over all hands played', () => {
    const rows = standings([
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0), ziMo(0), ziMo(1), ziMo(2)],
      ),
    ]);
    expect(rows.find((r) => r.key === 'player a')?.winRate).toBeCloseTo(0.5);
  });

  it('takes the best streak from any single game, not across games', () => {
    const rows = standings([
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0), ziMo(0)],
        '2026-01-01',
      ),
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0)],
        '2026-01-02',
      ),
    ]);
    // Two in a row in the first game, one in the second: the best run is two.
    expect(rows.find((r) => r.key === 'player a')?.longestWinStreak).toBe(2);
  });

  it('adds up dealer holds', () => {
    const rows = standings([
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0), ziMo(0)],
        '2026-01-01',
      ),
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [ziMo(0)],
        '2026-01-02',
      ),
    ]);
    expect(rows.find((r) => r.key === 'player a')?.dealerHolds).toBe(3);
  });

  it("ranks a player's most used patterns", () => {
    const rows = standings([
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [
          built(0, 3, [{ id: 'all_triplets', count: 1 }]),
          built(0, 5, [
            { id: 'all_triplets', count: 1 },
            { id: 'dragon_triplet', count: 1 },
          ]),
        ],
      ),
    ]);
    const aaron = rows.find((r) => r.key === 'player a');
    expect(aaron?.topPatterns[0]).toEqual({ id: 'all_triplets', count: 2 });
    expect(aaron?.topPatterns).toHaveLength(2);
  });

  it('keeps the best built hand across games as the signature', () => {
    const rows = standings([
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [built(0, 3, [{ id: 'all_triplets', count: 1 }])],
        '2026-01-01',
      ),
      makeGame(
        ['Player A', 'Player B', 'Player C', 'Player D'],
        [built(0, 7, [{ id: 'full_flush', count: 1 }])],
        '2026-01-02',
      ),
    ]);
    expect(rows.find((r) => r.key === 'player a')?.signatureHand?.faan).toBe(7);
  });

  it('leaves the signature empty when nobody used the builder', () => {
    const rows = standings([
      makeGame(['Player A', 'Player B', 'Player C', 'Player D'], [ziMo(0, 13)]),
    ]);
    expect(rows.find((r) => r.key === 'player a')?.signatureHand).toBeNull();
    expect(rows.find((r) => r.key === 'player a')?.topPatterns).toEqual([]);
  });
});

describe('finishing a game', () => {
  const game = () =>
    makeGame(['Player A', 'Player B', 'Player C', 'Player D'], [ziMo(0)]);

  it('is unfinished while the rounds are still running', () => {
    const [row] = summarise([game()]);
    expect(row.isComplete).toBe(false);
    expect(row.endedEarly).toBe(false);
    expect(row.isFinished).toBe(false);
  });

  it('is finished once the scorekeeper calls it', () => {
    const called: GameRecord = {
      ...game(),
      endedAt: '2026-01-01T22:00:00.000Z',
    };
    const [row] = summarise([called]);
    expect(row.isComplete).toBe(false);
    expect(row.endedEarly).toBe(true);
    expect(row.isFinished).toBe(true);
  });

  it('does not change any score', () => {
    const before = summarise([game()])[0].scores;
    const called: GameRecord = {
      ...game(),
      endedAt: '2026-01-01T22:00:00.000Z',
    };
    expect(summarise([called])[0].scores).toEqual(before);
  });

  it('still counts toward the all time standings', () => {
    const called: GameRecord = {
      ...game(),
      endedAt: '2026-01-01T22:00:00.000Z',
    };
    const rows = standings([called]);
    expect(rows.find((r) => r.key === 'player a')?.games).toBe(1);
    expect(rows.find((r) => r.key === 'player a')?.wins).toBe(1);
  });
});
