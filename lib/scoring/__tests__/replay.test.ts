import { describe, expect, it } from 'vitest';
import { replay } from '../replay';
import type { Hand, PlayerNames, Seat } from '../types';
import { OUR_TABLE, type Rules } from '@/lib/rules/types';

const PLAYERS: PlayerNames = ['East', 'South', 'West', 'North'];

function game(hands: readonly Hand[], rules: Rules = OUR_TABLE) {
  return { players: PLAYERS, rules, hands };
}

const ziMo = (winnerSeat: Seat, faan = 3): Hand => ({ type: 'zi_mo', winnerSeat, faan });
const draw = (): Hand => ({ type: 'draw' });
const zaaWu = (offenderSeat: Seat): Hand => ({ type: 'zaa_wu', offenderSeat });

/** Four hands, each won by the seat just after the dealer, cycling the dealer back to 0. */
const oneFullCycle: Hand[] = [ziMo(1), ziMo(2), ziMo(3), ziMo(0)];

describe('replay', () => {
  describe('a game with no hands', () => {
    const result = replay(game([]));

    it('starts with seat 0 dealing in the East round', () => {
      expect(result.currentDealerSeat).toBe(0);
      expect(result.currentRound).toBe('east');
    });

    it('starts everyone at zero', () => {
      expect(result.scores).toEqual([0, 0, 0, 0]);
      expect(result.series).toEqual([[0], [0], [0], [0]]);
      expect(result.lastDeltas).toEqual([0, 0, 0, 0]);
    });

    it('is not complete', () => {
      expect(result.isComplete).toBe(false);
      expect(result.handCount).toBe(0);
      expect(result.rows).toEqual([]);
    });
  });

  describe('dealer progression', () => {
    it('keeps the dealer when the dealer wins', () => {
      const result = replay(game([ziMo(0)]));
      expect(result.currentDealerSeat).toBe(0);
      expect(result.currentRound).toBe('east');
    });

    it('keeps the dealer when the dealer wins by Cheut Chung', () => {
      const result = replay(
        game([{ type: 'ceot_cung', winnerSeat: 0, discarderSeat: 2, faan: 4 }]),
      );
      expect(result.currentDealerSeat).toBe(0);
    });

    it('passes the dealer when a non dealer wins', () => {
      const result = replay(game([ziMo(2)]));
      expect(result.currentDealerSeat).toBe(1);
    });

    it('passes the dealer to the next seat, not to the winner', () => {
      const result = replay(game([ziMo(3)]));
      expect(result.currentDealerSeat).toBe(1);
    });

    it('keeps the dealer on a draw', () => {
      const result = replay(game([draw()]));
      expect(result.currentDealerSeat).toBe(0);
      expect(result.scores).toEqual([0, 0, 0, 0]);
    });

    it('keeps the dealer on a Zaa Wu', () => {
      const result = replay(game([zaaWu(2)]));
      expect(result.currentDealerSeat).toBe(0);
      expect(result.scores).toEqual([13, 13, -39, 13]);
    });

    it('keeps the dealer on a Zaa Wu by the dealer', () => {
      const result = replay(game([zaaWu(0)]));
      expect(result.currentDealerSeat).toBe(0);
    });
  });

  describe('round progression', () => {
    it('advances the round only when the dealer passes back to seat 0', () => {
      const partial = replay(game(oneFullCycle.slice(0, 3)));
      expect(partial.currentDealerSeat).toBe(3);
      expect(partial.currentRound).toBe('east');

      const full = replay(game(oneFullCycle));
      expect(full.currentDealerSeat).toBe(0);
      expect(full.currentRound).toBe('south');
    });

    it.each([
      [0, 'east', false],
      [1, 'south', false],
      [2, 'west', false],
      [3, 'north', false],
      [4, 'east', true],
    ] as const)(
      'sits in the %s round after %i full dealer cycles',
      (cycles, expectedRound, expectedComplete) => {
        const hands = Array.from({ length: cycles * 4 }, (_, n) => oneFullCycle[n % 4]);
        const result = replay(game(hands));
        expect(result.currentRound).toBe(expectedRound);
        expect(result.currentRoundIndex).toBe(cycles);
        expect(result.isComplete).toBe(expectedComplete);
      },
    );

    it('labels each hand with the round it was played in', () => {
      const hands = [...oneFullCycle, ...oneFullCycle];
      const result = replay(game(hands));
      expect(result.rows.slice(0, 4).map((r) => r.round)).toEqual([
        'east',
        'east',
        'east',
        'east',
      ]);
      expect(result.rows.slice(4, 8).map((r) => r.round)).toEqual([
        'south',
        'south',
        'south',
        'south',
      ]);
    });

    it('does not advance the round when the dealer keeps winning', () => {
      const result = replay(game([ziMo(0), ziMo(0), ziMo(0), ziMo(0), ziMo(0)]));
      expect(result.currentRound).toBe('east');
      expect(result.currentDealerSeat).toBe(0);
    });
  });

  describe('completion', () => {
    const sixteenHands = Array.from({ length: 16 }, (_, n) => oneFullCycle[n % 4]);

    it('is complete once the North round ends, after four cycles', () => {
      expect(replay(game(sixteenHands.slice(0, 15))).isComplete).toBe(false);
      expect(replay(game(sixteenHands)).isComplete).toBe(true);
    });

    it('still allows extra hands once complete, and marks them', () => {
      const withExtras = [...sixteenHands, ziMo(1), ziMo(2)];
      const result = replay(game(withExtras));
      expect(result.isComplete).toBe(true);
      expect(result.handCount).toBe(18);
      expect(result.rows.slice(0, 16).every((r) => !r.isExtra)).toBe(true);
      expect(result.rows.slice(16).every((r) => r.isExtra)).toBe(true);
    });
  });

  describe('running scores', () => {
    it('accumulates hand by hand', () => {
      const result = replay(game([ziMo(0, 3), ziMo(0, 3)]));
      expect(result.rows[0].scoresAfter).toEqual([18, -6, -6, -6]);
      expect(result.rows[1].scoresAfter).toEqual([36, -12, -12, -12]);
      expect(result.scores).toEqual([36, -12, -12, -12]);
    });

    it('reports the most recent hand change', () => {
      const result = replay(game([ziMo(0, 3), ziMo(1, 4)]));
      expect(result.lastDeltas).toEqual([-8, 24, -8, -8]);
    });

    it('builds a chart series with a leading zero for every player', () => {
      const result = replay(game([ziMo(0, 3), ziMo(1, 4)]));
      expect(result.series[0]).toEqual([0, 18, 10]);
      expect(result.series[1]).toEqual([0, -6, 18]);
    });
  });

  describe('derived state, never stored', () => {
    it('recalculates the dealer and round when an earlier hand is edited', () => {
      // Hand 1 won by the dealer, so the dealer stays put.
      const before = replay(game([ziMo(0), ziMo(2), ziMo(3)]));
      expect(before.currentDealerSeat).toBe(2);

      // Editing hand 1 so a non dealer won passes the dealer one seat earlier,
      // which shifts the dealer for every hand after it.
      const edited = replay(game([ziMo(1), ziMo(2), ziMo(3)]));
      expect(before.rows.map((r) => r.dealerSeat)).toEqual([0, 0, 1]);
      expect(edited.rows.map((r) => r.dealerSeat)).toEqual([0, 1, 2]);
      expect(edited.currentDealerSeat).toBe(3);
    });

    it('recalculates when a hand is deleted', () => {
      const full = replay(game(oneFullCycle));
      expect(full.currentRound).toBe('south');

      const withoutLast = replay(game(oneFullCycle.slice(0, 3)));
      expect(withoutLast.currentRound).toBe('east');
      expect(withoutLast.currentDealerSeat).toBe(3);
    });

    it('is a pure function of the hand list', () => {
      const hands = [...oneFullCycle];
      const first = replay(game(hands));
      const second = replay(game(hands));
      expect(second).toEqual(first);
    });
  });
});
