import { describe, expect, it } from 'vitest';
import { deltas, zaaWuCost } from '@/lib/scoring';
import { HK_STANDARD, OUR_TABLE, withRuleChange } from '../types';
import { withTrackedPenalty } from '../penalty';

/**
 * A false win is meant to cost a limit hand. That is one rule written in two
 * currencies - 384 on the doubling curve, 13 on the linear one - and the bug
 * these pin was the number staying in the old currency when the curve moved
 * out from under it.
 */

const change = (rules = HK_STANDARD, next: Parameters<typeof withRuleChange>[1]) =>
  withTrackedPenalty(rules, withRuleChange(rules, next));

describe('a penalty that follows the curve', () => {
  it('comes down to a limit hand when the curve goes linear', () => {
    // The reported case: Hong Kong standard, then a linear curve. 384 was
    // about thirty times the biggest hand the table could now score.
    expect(HK_STANDARD.zaaWuPenalty).toBe(384);
    expect(change(HK_STANDARD, { curve: 'linear' }).zaaWuPenalty).toBe(13);
  });

  it('goes back up when the curve goes back', () => {
    const linear = change(HK_STANDARD, { curve: 'linear' });
    expect(change(linear, { curve: 'doubling' }).zaaWuPenalty).toBe(384);
  });

  it('follows the cap as well, since that is what a limit hand is', () => {
    expect(change(OUR_TABLE, { faanCap: 10 }).zaaWuPenalty).toBe(10);
    expect(change(HK_STANDARD, { faanCap: 10 }).zaaWuPenalty).toBe(128);
  });

  it('leaves a number somebody set on purpose alone', () => {
    const own = withRuleChange(OUR_TABLE, { zaaWuPenalty: 50 });
    expect(change(own, { curve: 'doubling' }).zaaWuPenalty).toBe(50);
  });

  it('does not undo the step that set the penalty itself', () => {
    // The trap: at 13 the penalty is the limit, so a tracker that only
    // compared against the limit would snap 14 straight back to 13.
    expect(OUR_TABLE.zaaWuPenalty).toBe(13);
    expect(change(OUR_TABLE, { zaaWuPenalty: 14 }).zaaWuPenalty).toBe(14);
  });

  it('leaves everything else about the rules untouched', () => {
    const next = change(HK_STANDARD, { curve: 'linear' });
    expect({ ...next, zaaWuPenalty: 0, curve: 'x', preset: 'x' }).toEqual({
      ...HK_STANDARD,
      zaaWuPenalty: 0,
      curve: 'x',
      preset: 'x',
    });
  });
});

describe('what a false win actually costs', () => {
  it('is three times the penalty when no dealer bonus is running', () => {
    const cost = zaaWuCost(OUR_TABLE);
    expect(cost).toEqual({ asPlayer: 39, asDealer: 39 });
  });

  it('charges the dealer more, and the others a little more than three', () => {
    // One of the three being paid is the dealer, so even a player who is not
    // dealing pays more than three times.
    const doubled = withRuleChange(OUR_TABLE, { dealerMult: 2 });
    expect(zaaWuCost(doubled)).toEqual({
      asPlayer: 13 * 2 + 13 + 13,
      asDealer: 13 * 2 * 3,
    });
  });

  it('agrees with what the engine charges, for every seat', () => {
    const doubled = withRuleChange(OUR_TABLE, { dealerMult: 2 });
    const { asPlayer, asDealer } = zaaWuCost(doubled);
    for (const offender of [0, 1, 2, 3] as const) {
      const paid = -deltas({ type: 'zaa_wu', offenderSeat: offender }, doubled, 0)[
        offender
      ];
      expect(paid).toBe(offender === 0 ? asDealer : asPlayer);
    }
  });
});
