import { describe, expect, it } from 'vitest';
import type { Hand, Liability, PlayerNames } from '@/lib/scoring';
import { OUR_TABLE, withRuleChange } from '@/lib/rules/types';
import { describeRider } from '../describe';

/**
 * The second line under a hand in the log.
 *
 * Two shapes have to read well, because the record sheet changed its mind
 * about one of them. Hands recorded while it asked which rule applied carry a
 * name; hands recorded since carry only a payer, and the line has to not look
 * like it is missing something.
 */

const PLAYERS = ['Ann', 'Bo', 'Cal', 'Di'] as unknown as PlayerNames;
const rider = (hand: Hand, rules = OUR_TABLE) =>
  describeRider(hand, PLAYERS, rules);

const selfDraw = (liability?: Liability): Hand =>
  ({ type: 'zi_mo', winnerSeat: 0, faan: 6, liability }) as Hand;

describe('who paid for the table', () => {
  it('names the rule when the hand recorded one', () => {
    expect(rider(selfDraw({ seat: 2, reason: 'twelve_pieces' }))).toBe(
      '包 12 Pieces · Cal paid for the table',
    );
  });

  it('says it plainly when the hand did not', () => {
    // No dangling separator, and nothing that reads as a missing word.
    expect(rider(selfDraw({ seat: 2 }))).toBe('包 Cal paid for the table');
  });

  it('treats a reason of "other" as no name worth printing', () => {
    expect(rider(selfDraw({ seat: 2, reason: 'other' }))).toBe(
      '包 Cal paid for the table',
    );
  });

  it('says who it was split with, when it was', () => {
    const shared: Hand = {
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 5,
      liability: { seat: 3 },
    };
    expect(rider(shared)).toBe('包 Di split it with Bo');
  });

  it('does not say split where the table does not split', () => {
    const strict = withRuleChange(OUR_TABLE, {
      liabilityWithDiscarder: 'liable_pays_all',
    });
    const hand: Hand = {
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 5,
      liability: { seat: 3 },
    };
    expect(rider(hand, strict)).toBe('包 Di paid for the table');
  });

  it('has nothing to say about an ordinary hand', () => {
    expect(rider(selfDraw())).toBeNull();
  });

  it('says a hand was set by hand, with the note', () => {
    const adjusted: Hand = {
      type: 'draw',
      adjustment: { amounts: [1, -1, 0, 0], note: 'side bet' },
    };
    expect(rider(adjusted)).toBe('Adjusted · side bet');
  });
});
