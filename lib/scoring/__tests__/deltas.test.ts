import { describe, expect, it } from 'vitest';
import { ScoringError, deltas, isCompleteHand } from '../deltas';
import { SEATS, faanValues, type Hand, type Seat } from '../types';
import {
  DOUBLING_CURVE,
  HK_STANDARD,
  OUR_TABLE,
  type Rules,
} from '@/lib/rules/types';

const sum = (d: readonly number[]) => d.reduce((a, b) => a + b, 0);

const ceotCung = (
  winnerSeat: Seat,
  discarderSeat: Seat,
  faan: number,
): Hand => ({
  type: 'ceot_cung',
  winnerSeat,
  discarderSeat,
  faan,
});
const ziMo = (winnerSeat: Seat, faan: number): Hand => ({
  type: 'zi_mo',
  winnerSeat,
  faan,
});

describe('Our table', () => {
  it('pays 2 units from the shooter and 1 from each other on a discard win', () => {
    // 4 faan: shooter -8, others -4 each, winner +16.
    expect(deltas(ceotCung(0, 1, 4), OUR_TABLE)).toEqual([16, -8, -4, -4]);
  });

  it('takes 2 units from each loser on a self drawn win', () => {
    // 5 faan: losers -10 each, winner +30.
    expect(deltas(ziMo(0, 5), OUR_TABLE)).toEqual([30, -10, -10, -10]);
  });

  it('pays the false win penalty to each other player', () => {
    expect(deltas({ type: 'zaa_wu', offenderSeat: 2 }, OUR_TABLE)).toEqual([
      13, 13, -39, 13,
    ]);
  });

  it('changes nothing on a draw', () => {
    expect(deltas({ type: 'draw' }, OUR_TABLE)).toEqual([0, 0, 0, 0]);
  });
});

describe('HK standard', () => {
  it('has only the discarder pay on a discard win', () => {
    // 4 faan on the doubling curve is 16 units: shooter -32, others 0.
    expect(deltas(ceotCung(0, 1, 4), HK_STANDARD)).toEqual([32, -32, 0, 0]);
  });

  it('takes one unit from each loser on a self drawn win', () => {
    // 4 faan: losers -16 each, winner +48.
    expect(deltas(ziMo(0, 4), HK_STANDARD)).toEqual([48, -16, -16, -16]);
  });

  it('pays the cap for a limit hand, self drawn, at a 10 faan cap', () => {
    const cappedAtTen: Rules = { ...HK_STANDARD, faanCap: 10 };
    const limitHand: Hand = {
      type: 'zi_mo',
      winnerSeat: 0,
      faan: 13,
      isLimit: true,
    };
    // Unit at 10 faan is 128: losers -128 each, winner +384.
    expect(deltas(limitHand, cappedAtTen)).toEqual([384, -128, -128, -128]);
  });

  it('does not add the self draw bonus itself, since the stored faan is final', () => {
    // The builder adds selfDrawBonusFaan before saving. If the engine added it
    // too, this 4 faan hand would pay at 5 faan, which is 24 a head.
    expect(HK_STANDARD.selfDrawBonusFaan).toBe(1);
    expect(deltas(ziMo(0, 4), HK_STANDARD)[1]).toBe(-16);
  });
});

describe('limit hands', () => {
  const bigThreeDragons = (faan: number): Hand => ({
    type: 'ceot_cung',
    winnerSeat: 0,
    discarderSeat: 1,
    faan,
    isLimit: true,
  });

  it('pays the cap even when its own faan is below it', () => {
    // 8 faan with a 13 faan cap, paying the cap: unit 384, shooter pays 2x.
    expect(deltas(bigThreeDragons(8), HK_STANDARD)).toEqual([768, -768, 0, 0]);
  });

  it('pays its own faan when the table does not play limit hands that way', () => {
    const ownFaan: Rules = { ...HK_STANDARD, limitPaysCap: false };
    // Unit at 8 faan is 64, so the shooter pays 128.
    expect(deltas(bigThreeDragons(8), ownFaan)).toEqual([128, -128, 0, 0]);
  });

  it('clamps an ordinary hand above the cap', () => {
    const ordinary: Hand = { type: 'zi_mo', winnerSeat: 0, faan: 20 };
    const capped: Rules = { ...OUR_TABLE, faanCap: 13 };
    expect(deltas(ordinary, capped)).toEqual([78, -26, -26, -26]);
  });
});

describe('dealer bonus', () => {
  const withBonus: Rules = { ...OUR_TABLE, dealerMult: 1.5 };

  it('multiplies the dealer payment and leaves the others alone', () => {
    // Seat 1 deals and shoots into seat 0 for 4 faan.
    // Shooter would pay 8, and 1.5x makes it 12. The other two still pay 4.
    const result = deltas(ceotCung(0, 1, 4), withBonus, 1);
    expect(result).toEqual([20, -12, -4, -4]);
    expect(sum(result)).toBe(0);
  });

  it('multiplies every payment when the dealer wins', () => {
    const result = deltas(ziMo(0, 4), withBonus, 0);
    // Each loser would pay 8, and 1.5x makes it 12.
    expect(result).toEqual([36, -12, -12, -12]);
    expect(sum(result)).toBe(0);
  });

  it('rounds each payment to a whole number and still balances', () => {
    // 5 faan, 1 unit each, is 5; 1.5x is 7.5, which rounds to 8.
    const result = deltas(ceotCung(0, 2, 5), withBonus, 1);
    expect(result.every(Number.isInteger)).toBe(true);
    expect(sum(result)).toBe(0);
    expect(result[1]).toBe(-8);
  });

  it('does nothing when no dealer is given', () => {
    expect(deltas(ceotCung(0, 1, 4), withBonus)).toEqual([16, -8, -4, -4]);
  });

  it('applies to a false win too', () => {
    const result = deltas({ type: 'zaa_wu', offenderSeat: 2 }, withBonus, 0);
    expect(sum(result)).toBe(0);
    expect(result[0]).toBe(20); // 13 x 1.5 rounds to 20
  });
});

describe('payout curves', () => {
  it('pays the faan itself on the linear curve', () => {
    for (const faan of faanValues(OUR_TABLE)) {
      expect(deltas(ziMo(0, faan), OUR_TABLE)[0]).toBe(faan * 6);
    }
  });

  it('follows the published table on the doubling curve', () => {
    for (const faan of faanValues(HK_STANDARD)) {
      expect(deltas(ziMo(0, faan), HK_STANDARD)[0]).toBe(
        DOUBLING_CURVE[faan] * 3,
      );
    }
  });

  it('uses the table the player wrote on a custom curve', () => {
    const custom: Rules = {
      ...OUR_TABLE,
      curve: 'custom',
      customCurve: { 3: 5, 4: 10, 5: 20 },
      faanCap: 5,
    };
    expect(deltas(ziMo(0, 4), custom)).toEqual([60, -20, -20, -20]);
  });
});

describe('validation', () => {
  it('rejects faan below the table minimum', () => {
    expect(() => deltas(ziMo(0, 2), OUR_TABLE)).toThrow(ScoringError);
  });

  it('rejects fractional faan', () => {
    expect(() => deltas(ziMo(0, 3.5), OUR_TABLE)).toThrow(ScoringError);
  });

  it('rejects a player dealing in to their own win', () => {
    expect(() => deltas(ceotCung(1, 1, 4), OUR_TABLE)).toThrow(ScoringError);
  });

  it('rejects a negative false win penalty', () => {
    const bad: Rules = { ...OUR_TABLE, zaaWuPenalty: -1 };
    expect(() => deltas({ type: 'zaa_wu', offenderSeat: 0 }, bad)).toThrow(
      ScoringError,
    );
  });
});

describe('every hand sums to zero', () => {
  const PRESETS: [string, Rules][] = [
    ['our table', OUR_TABLE],
    ['hk standard', HK_STANDARD],
    ['dealer bonus', { ...OUR_TABLE, dealerMult: 1.5 }],
    [
      'shooter pays all',
      { ...OUR_TABLE, discardShooterMult: 4, discardOthersMult: 0 },
    ],
    [
      'half shooter',
      { ...OUR_TABLE, discardShooterMult: 2, discardOthersMult: 1 },
    ],
    ['limit pays own faan', { ...HK_STANDARD, limitPaysCap: false }],
  ];

  it.each(PRESETS)('holds across every hand under %s', (_name, rules) => {
    for (const faan of faanValues(rules)) {
      for (const winner of SEATS) {
        for (const dealer of SEATS) {
          expect(sum(deltas(ziMo(winner, faan), rules, dealer))).toBe(0);
          for (const shooter of SEATS) {
            if (shooter === winner) continue;
            expect(
              sum(deltas(ceotCung(winner, shooter, faan), rules, dealer)),
            ).toBe(0);
          }
        }
        expect(
          sum(deltas({ type: 'zaa_wu', offenderSeat: winner }, rules, 0)),
        ).toBe(0);
      }
    }
  });

  it('holds for limit hands too', () => {
    for (const rules of [OUR_TABLE, HK_STANDARD]) {
      for (const dealer of SEATS) {
        const hand: Hand = {
          type: 'zi_mo',
          winnerSeat: 1,
          faan: 13,
          isLimit: true,
        };
        expect(sum(deltas(hand, rules, dealer))).toBe(0);
      }
    }
  });
});

describe('isCompleteHand', () => {
  it('needs a type', () => {
    expect(isCompleteHand({}, OUR_TABLE)).toBe(false);
  });

  it('needs a winner and faan for a self drawn win', () => {
    expect(isCompleteHand({ type: 'zi_mo', winnerSeat: 0 }, OUR_TABLE)).toBe(
      false,
    );
    expect(
      isCompleteHand({ type: 'zi_mo', winnerSeat: 0, faan: 3 }, OUR_TABLE),
    ).toBe(true);
  });

  it('needs a winner, a discarder and faan for a discard win', () => {
    expect(
      isCompleteHand({ type: 'ceot_cung', winnerSeat: 0, faan: 3 }, OUR_TABLE),
    ).toBe(false);
    expect(
      isCompleteHand(
        { type: 'ceot_cung', winnerSeat: 0, discarderSeat: 1, faan: 3 },
        OUR_TABLE,
      ),
    ).toBe(true);
  });

  it('rejects a winner who dealt in to themselves', () => {
    expect(
      isCompleteHand(
        { type: 'ceot_cung', winnerSeat: 1, discarderSeat: 1, faan: 3 },
        OUR_TABLE,
      ),
    ).toBe(false);
  });

  it('needs only an offender for a false win', () => {
    expect(isCompleteHand({ type: 'zaa_wu' }, OUR_TABLE)).toBe(false);
    expect(isCompleteHand({ type: 'zaa_wu', offenderSeat: 3 }, OUR_TABLE)).toBe(
      true,
    );
  });

  it('needs nothing further for a draw', () => {
    expect(isCompleteHand({ type: 'draw' }, OUR_TABLE)).toBe(true);
  });

  it('rejects faan below the table minimum', () => {
    expect(
      isCompleteHand({ type: 'zi_mo', winnerSeat: 0, faan: 2 }, OUR_TABLE),
    ).toBe(false);
  });

  it('follows a table that allows lower faan', () => {
    const oneFaanMin: Rules = { ...OUR_TABLE, minFaan: 1 };
    expect(
      isCompleteHand({ type: 'zi_mo', winnerSeat: 0, faan: 1 }, oneFaanMin),
    ).toBe(true);
  });
});
