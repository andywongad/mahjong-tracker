import { describe, expect, it } from 'vitest';
import { deltas } from '../deltas';
import { HK_STANDARD, OUR_TABLE, withRuleChange } from '@/lib/rules/types';
import type { Hand, Seat } from '../types';

/**
 * 包: one player paying what the whole table would have paid.
 *
 * The engine never decides this - it cannot see which tile was fed or which
 * sets were exposed - so every case here starts from a hand somebody marked.
 * What is tested is only the money: that the winner is paid exactly what the
 * rules always said, that the bill lands on the right person, and that
 * nothing is created or lost on the way.
 */

const A: Seat = 0;
const B: Seat = 1;
const C: Seat = 2;
const D: Seat = 3;

const ziMo = (winnerSeat: Seat, faan: number, liable?: Seat): Hand => ({
  type: 'zi_mo',
  winnerSeat,
  faan,
  ...(liable === undefined
    ? {}
    : { liability: { seat: liable, reason: 'twelve_pieces' } }),
});

const ceotCung = (
  winnerSeat: Seat,
  discarderSeat: Seat,
  faan: number,
  liable?: Seat,
): Hand => ({
  type: 'ceot_cung',
  winnerSeat,
  discarderSeat,
  faan,
  ...(liable === undefined
    ? {}
    : { liability: { seat: liable, reason: 'nine_pieces' } }),
});

describe('a self drawn hand somebody is liable for', () => {
  it('puts the whole table on the liable player', () => {
    // Our table, 6 faan: 12 from each of three, so 36 in all.
    expect(deltas(ziMo(B, 6, C), OUR_TABLE)).toEqual([0, 36, -36, 0]);
  });

  it('is the same rule under a different curve', () => {
    // Hong Kong standard, 4 faan: 16 from each of three.
    expect(deltas(ziMo(A, 4, D), HK_STANDARD)).toEqual([48, 0, 0, -48]);
  });

  it('pays the winner exactly what they would have had anyway', () => {
    const plain = deltas(ziMo(B, 6), OUR_TABLE);
    const owed = deltas(ziMo(B, 6, C), OUR_TABLE);
    expect(owed[B]).toBe(plain[B]);
  });
});

describe('a discard hand somebody is liable for', () => {
  it('leaves the other two out when the one who fed it is liable', () => {
    // Our table, 5 faan: 10 from the shooter and 5 from each other, 20 in all.
    expect(deltas(ceotCung(B, C, 5, C), OUR_TABLE)).toEqual([0, 20, -20, 0]);
  });

  it('splits it with whoever fed it, by default', () => {
    expect(deltas(ceotCung(B, C, 5, D), OUR_TABLE)).toEqual([0, 20, -10, -10]);
  });

  it('puts it all on the liable player where the table says so', () => {
    const strict = withRuleChange(OUR_TABLE, {
      liabilityWithDiscarder: 'liable_pays_all',
    });
    expect(deltas(ceotCung(B, C, 5, D), strict)).toEqual([0, 20, 0, -20]);
  });

  it('gives the odd point to the player the rule is named after', () => {
    // Our table's 2 + 1 + 1 can only ever total an even number, so this
    // needs a table whose split is odd: the shooter paying three and the
    // others one each is five units, and 3 faan makes that fifteen points.
    const odd = withRuleChange(OUR_TABLE, {
      discardShooterMult: 3,
      discardOthersMult: 1,
    });
    const out = deltas(ceotCung(B, C, 3, D), odd);
    expect(out[B]).toBe(15);
    // Eight and seven, not seven and eight.
    expect(out[D]).toBe(-8);
    expect(out[C]).toBe(-7);
  });
});

describe('what it refuses', () => {
  it('will not let the winner be liable for their own hand', () => {
    expect(() => deltas(ziMo(B, 6, B), OUR_TABLE)).toThrow(/cannot be liable/);
  });

  it('still balances, whoever ends up paying', () => {
    const cases: Hand[] = [
      ziMo(B, 6, C),
      ceotCung(B, C, 5, C),
      ceotCung(B, C, 5, D),
      ceotCung(A, D, 9, B),
    ];
    for (const hand of cases) {
      const out = deltas(hand, OUR_TABLE);
      expect(out[0] + out[1] + out[2] + out[3]).toBe(0);
    }
  });
});

describe('amounts entered by hand', () => {
  const byHand = (amounts: [number, number, number, number]): Hand => ({
    type: 'ceot_cung',
    winnerSeat: B,
    discarderSeat: C,
    faan: 5,
    adjustment: { amounts, note: 'settled at the table' },
  });

  it('replaces whatever the rules would have computed', () => {
    expect(deltas(byHand([1, 2, -3, 0]), OUR_TABLE)).toEqual([1, 2, -3, 0]);
  });

  it('is refused unless it balances', () => {
    expect(() => deltas(byHand([1, 2, 3, 4]), OUR_TABLE)).toThrow(
      /sum to zero/,
    );
  });

  it('wins over a liability on the same hand', () => {
    const both: Hand = {
      type: 'zi_mo',
      winnerSeat: B,
      faan: 6,
      liability: { seat: C, reason: 'twelve_pieces' },
      adjustment: { amounts: [0, 9, -9, 0] },
    };
    expect(deltas(both, OUR_TABLE)).toEqual([0, 9, -9, 0]);
  });
});
