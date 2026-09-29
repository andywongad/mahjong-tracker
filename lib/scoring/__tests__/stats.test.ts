import { describe, expect, it } from 'vitest';
import { stats } from '../stats';
import { AUG_19_2026_GAME } from '../fixtures/aug-19-2026';
import { faanValues, type Hand, type PlayerNames, type Seat } from '../types';
import { OUR_TABLE, type Rules } from '@/lib/rules/types';

const PLAYERS: PlayerNames = ['Player A', 'Player B', 'Player C', 'Player D'];

function game(hands: readonly Hand[], rules: Rules = OUR_TABLE) {
  return { players: PLAYERS, rules, hands };
}

const ziMo = (winnerSeat: Seat, faan = 3): Hand => ({
  type: 'zi_mo',
  winnerSeat,
  faan,
});
const ceotCung = (winnerSeat: Seat, discarderSeat: Seat, faan = 3): Hand => ({
  type: 'ceot_cung',
  winnerSeat,
  discarderSeat,
  faan,
});

describe('stats', () => {
  describe('a game with no hands', () => {
    const result = stats(game([]));

    it('returns one row per seat, named and in seat order', () => {
      expect(result.players.map((p) => p.name)).toEqual([
        'Player A',
        'Player B',
        'Player C',
        'Player D',
      ]);
      expect(result.players.map((p) => p.seat)).toEqual([0, 1, 2, 3]);
    });

    it('zeroes every tally', () => {
      for (const player of result.players) {
        expect(player.wins).toBe(0);
        expect(player.ziMo).toBe(0);
        expect(player.ceotCung).toBe(0);
        expect(player.zaaWu).toBe(0);
        expect(player.biggestHand).toBe(0);
        expect(player.score).toBe(0);
      }
    });

    it('still lists every point value as a column', () => {
      for (const player of result.players) {
        expect(Object.keys(player.winsByFaan).map(Number)).toEqual(
          faanValues(OUR_TABLE),
        );
        expect(Object.keys(player.dealtInByFaan).map(Number)).toEqual(
          faanValues(OUR_TABLE),
        );
      }
    });
  });

  describe('counting wins', () => {
    it('counts both win types toward wins, and only self draws toward Zi Mo', () => {
      const result = stats(game([ziMo(0), ceotCung(0, 1), ceotCung(0, 2)]));
      expect(result.players[0].wins).toBe(3);
      expect(result.players[0].ziMo).toBe(1);
    });

    it('does not count a win as dealing in', () => {
      const result = stats(game([ceotCung(0, 1)]));
      expect(result.players[0].ceotCung).toBe(0);
      expect(result.players[1].ceotCung).toBe(1);
    });

    it('counts dealing in against the discarder, not the winner', () => {
      const result = stats(game([ceotCung(2, 3), ceotCung(2, 3)]));
      expect(result.players[3].ceotCung).toBe(2);
      expect(result.players[2].ceotCung).toBe(0);
    });
  });

  describe('by point value', () => {
    it('tallies wins into the right point column', () => {
      const result = stats(game([ziMo(0, 3), ziMo(0, 7), ceotCung(0, 1, 7)]));
      expect(result.players[0].winsByFaan[3]).toBe(1);
      expect(result.players[0].winsByFaan[7]).toBe(2);
      expect(result.players[0].winsByFaan[13]).toBe(0);
    });

    it('tallies dealing in into the right point column', () => {
      const result = stats(
        game([ceotCung(0, 1, 5), ceotCung(2, 1, 5), ceotCung(3, 1, 13)]),
      );
      expect(result.players[1].dealtInByFaan[5]).toBe(2);
      expect(result.players[1].dealtInByFaan[13]).toBe(1);
      expect(result.players[1].ceotCung).toBe(3);
    });
  });

  describe('biggest hand', () => {
    it('records the largest single hand gain', () => {
      const result = stats(game([ziMo(0, 3), ziMo(0, 6), ziMo(0, 4)]));
      expect(result.players[0].biggestHand).toBe(36);
    });

    it('stays at zero for a player who never gained', () => {
      const result = stats(game([ziMo(0, 3)]));
      expect(result.players[1].biggestHand).toBe(0);
      expect(result.players[1].score).toBeLessThan(0);
    });

    it('counts a gain from someone else calling a false win', () => {
      const result = stats(game([{ type: 'zaa_wu', offenderSeat: 0 }]));
      expect(result.players[1].biggestHand).toBe(13);
      expect(result.players[0].biggestHand).toBe(0);
    });

    it('is a single hand figure, not a running total', () => {
      const result = stats(game([ziMo(0, 3), ziMo(0, 3)]));
      expect(result.players[0].score).toBe(36);
      expect(result.players[0].biggestHand).toBe(18);
    });
  });

  describe('Zaa Wu', () => {
    it('counts against the offender only', () => {
      const result = stats(
        game([
          { type: 'zaa_wu', offenderSeat: 2 },
          { type: 'zaa_wu', offenderSeat: 2 },
        ]),
      );
      expect(result.players.map((p) => p.zaaWu)).toEqual([0, 0, 2, 0]);
      expect(result.players[2].score).toBe(-78);
    });

    it('is not counted as a win or a deal in', () => {
      const result = stats(game([{ type: 'zaa_wu', offenderSeat: 1 }]));
      expect(result.players.map((p) => p.wins)).toEqual([0, 0, 0, 0]);
      expect(result.players.map((p) => p.ceotCung)).toEqual([0, 0, 0, 0]);
    });

    it('uses the game penalty', () => {
      const result = stats(
        game([{ type: 'zaa_wu', offenderSeat: 1 }], {
          ...OUR_TABLE,
          zaaWuPenalty: 5,
        }),
      );
      expect(result.players[1].score).toBe(-15);
    });
  });

  describe('draws', () => {
    it('changes nothing at all', () => {
      const result = stats(game([{ type: 'draw' }, { type: 'draw' }]));
      for (const player of result.players) {
        expect(player.wins).toBe(0);
        expect(player.score).toBe(0);
        expect(player.biggestHand).toBe(0);
      }
      expect(result.handCount).toBe(2);
    });
  });

  describe('scores always sum to zero', () => {
    it('across a mixed game', () => {
      const result = stats(
        game([
          ziMo(0, 3),
          ceotCung(1, 2, 5),
          { type: 'zaa_wu', offenderSeat: 3 },
          { type: 'draw' },
          ceotCung(2, 0, 13),
        ]),
      );
      const total = result.players.reduce((acc, p) => acc + p.score, 0);
      expect(total).toBe(0);
    });
  });
});

/**
 * The group's spreadsheet carried an audit block at the bottom: each column
 * totalled, every hand accounted for by exactly one outcome, and the four
 * scores summing to zero. These totals reproduce it.
 */
describe('audit totals', () => {
  it('accounts for every hand across the outcomes', () => {
    const result = stats(
      game([
        ziMo(0),
        ceotCung(1, 2),
        { type: 'zaa_wu', offenderSeat: 3 },
        { type: 'draw' },
      ]),
    );
    expect(result.totals.ziMo).toBe(1);
    expect(result.totals.ceotCung).toBe(1);
    expect(result.totals.zaaWu).toBe(1);
    expect(result.totals.draws).toBe(1);
    expect(result.totals.accountedFor).toBe(4);
    expect(result.handCount).toBe(4);
    expect(result.totals.reconciles).toBe(true);
  });

  it('totals wins as self draws plus hands won on a discard', () => {
    const result = stats(
      game([ziMo(0), ziMo(1), ceotCung(2, 3), ceotCung(3, 0)]),
    );
    expect(result.totals.wins).toBe(4);
    expect(result.totals.wins).toBe(
      result.totals.ziMo + result.totals.ceotCung,
    );
  });

  it('sums the scores to zero', () => {
    const result = stats(
      game([
        ziMo(0, 5),
        ceotCung(1, 2, 13),
        { type: 'zaa_wu', offenderSeat: 0 },
      ]),
    );
    expect(result.totals.score).toBe(0);
    expect(result.totals.reconciles).toBe(true);
  });

  it('reconciles an empty game', () => {
    const result = stats(game([]));
    expect(result.totals.accountedFor).toBe(0);
    expect(result.totals.reconciles).toBe(true);
  });

  it('matches the reference game totals: 8 self draws, 11 discards, 19 hands', () => {
    const result = stats(AUG_19_2026_GAME);
    expect(result.totals.ziMo).toBe(8);
    expect(result.totals.ceotCung).toBe(11);
    expect(result.totals.zaaWu).toBe(0);
    expect(result.totals.wins).toBe(19);
    expect(result.totals.accountedFor).toBe(19);
    expect(result.totals.score).toBe(0);
    expect(result.totals.reconciles).toBe(true);
  });
});

describe('rates and streaks', () => {
  it('reports a win rate over hands played', () => {
    const result = stats(game([ziMo(0), ziMo(0), ziMo(1), ceotCung(2, 0)]));
    expect(result.players[0].winRate).toBeCloseTo(0.5);
    expect(result.players[1].winRate).toBeCloseTo(0.25);
    expect(result.players[3].winRate).toBe(0);
  });

  it('reports zero rates for a game with no hands', () => {
    const result = stats(game([]));
    for (const player of result.players) {
      expect(player.winRate).toBe(0);
      expect(player.ceotCungRate).toBe(0);
      expect(player.ziMoShare).toBe(0);
    }
  });

  it('counts the longest run of wins, not the total', () => {
    // Seat 0 wins three in a row, then once more later.
    const result = stats(game([ziMo(0), ziMo(0), ziMo(0), ziMo(1), ziMo(0)]));
    expect(result.players[0].wins).toBe(4);
    expect(result.players[0].longestWinStreak).toBe(3);
  });

  it('breaks a streak on any hand the player did not win', () => {
    const result = stats(game([ziMo(0), { type: 'draw' }, ziMo(0)]));
    expect(result.players[0].longestWinStreak).toBe(1);
  });

  it('counts a deal in rate over hands played', () => {
    const result = stats(
      game([ceotCung(0, 1), ceotCung(0, 1), ziMo(2), { type: 'draw' }]),
    );
    expect(result.players[1].ceotCungRate).toBeCloseTo(0.5);
  });

  it("reports the self drawn share of a player's own wins", () => {
    const result = stats(
      game([ziMo(0), ceotCung(0, 1), ceotCung(0, 2), ceotCung(0, 3)]),
    );
    expect(result.players[0].ziMoShare).toBeCloseTo(0.25);
  });

  it('counts hands won while holding the deal', () => {
    // Seat 0 deals first and wins, so keeps the deal and wins again.
    const result = stats(game([ziMo(0), ziMo(0), ziMo(1)]));
    expect(result.players[0].dealerHolds).toBe(2);
    // Seat 1 won, but seat 0 was dealing at the time.
    expect(result.players[1].dealerHolds).toBe(0);
  });

  it('credits a dealer hold to whoever actually held the deal', () => {
    // Seat 2 wins first, so the deal passes to seat 1, who then wins.
    const result = stats(game([ziMo(2), ziMo(1)]));
    expect(result.players[1].dealerHolds).toBe(1);
    expect(result.players[2].dealerHolds).toBe(0);
  });
});

describe('patterns and signature hands', () => {
  const built = (
    winnerSeat: Seat,
    faan: number,
    patterns: { id: string; count: number }[],
    isLimit = false,
  ): Hand => ({ type: 'zi_mo', winnerSeat, faan, patterns, isLimit });

  it('counts how often each pattern was used', () => {
    const result = stats(
      game([
        built(0, 3, [{ id: 'all_triplets', count: 1 }]),
        built(0, 5, [
          { id: 'all_triplets', count: 1 },
          { id: 'dragon_triplet', count: 2 },
        ]),
      ]),
    );
    expect(result.players[0].patternCounts.all_triplets).toBe(2);
    expect(result.players[0].patternCounts.dragon_triplet).toBe(2);
  });

  it('keeps the highest faan built hand as the signature', () => {
    const result = stats(
      game([
        built(0, 3, [{ id: 'all_triplets', count: 1 }]),
        built(0, 7, [{ id: 'full_flush', count: 1 }]),
        built(0, 5, [{ id: 'small_three_dragons', count: 1 }]),
      ]),
    );
    expect(result.players[0].signatureHand?.faan).toBe(7);
    expect(result.players[0].signatureHand?.patterns[0].id).toBe('full_flush');
  });

  it('ignores hands entered as a plain faan number', () => {
    const result = stats(game([ziMo(0, 13)]));
    expect(result.players[0].signatureHand).toBeNull();
    expect(result.players[0].patternCounts).toEqual({});
  });

  it('prefers a built hand even when a higher hand was tapped in', () => {
    const result = stats(
      game([ziMo(0, 13), built(0, 4, [{ id: 'seven_pairs', count: 1 }])]),
    );
    expect(result.players[0].signatureHand?.faan).toBe(4);
  });

  it('remembers whether the signature hand was a limit hand', () => {
    const result = stats(
      game([built(0, 13, [{ id: 'thirteen_orphans', count: 1 }], true)]),
    );
    expect(result.players[0].signatureHand?.isLimit).toBe(true);
  });
});
