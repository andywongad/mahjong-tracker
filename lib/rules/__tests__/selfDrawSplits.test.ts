import { describe, expect, it } from 'vitest';
import { deltas, type Hand } from '@/lib/scoring';
import { replay } from '@/lib/scoring/replay';
import { AUG_19_2026_GAME } from '@/lib/scoring/fixtures/aug-19-2026';
import { unitFor } from '../curve';
import { HK_STANDARD, OUR_TABLE, withRuleChange } from '../types';
import { SELF_DRAW_SPLITS, selfDrawIdFor } from '../selfDrawSplits';

/**
 * The list exists so the sheet cannot drift from the engine, so that is what
 * is tested: not the words on the buttons, but that choosing one of them
 * really does move the money it says it will.
 */

const SELF_DRAW: Hand = { type: 'zi_mo', winnerSeat: 0, faan: 6 };

describe('what each option actually pays', () => {
  for (const split of SELF_DRAW_SPLITS) {
    it(`pays ${split.each} each under “${split.label}”`, () => {
      const rules = withRuleChange(HK_STANDARD, {
        selfDrawEachMult: split.each,
      });
      const unit = unitFor(6, rules);
      const paid = deltas(SELF_DRAW, rules);

      expect(paid[1]).toBe(-unit * split.each);
      expect(paid[2]).toBe(-unit * split.each);
      expect(paid[3]).toBe(-unit * split.each);
      // Three payers, so the winner takes three times what each one pays.
      expect(paid[0]).toBe(unit * split.each * 3);
      expect(paid[0] + paid[1] + paid[2] + paid[3]).toBe(0);
    });
  }

  it('is exactly a doubling between the two', () => {
    const [face, double] = SELF_DRAW_SPLITS;
    expect(double.each).toBe(face.each * 2);
  });
});

describe('which option a set of rules is on', () => {
  it('names both presets rather than calling either one custom', () => {
    // A preset the sheet cannot find in the list would show nothing
    // selected, which reads as a question nobody has answered.
    expect(selfDrawIdFor(HK_STANDARD)).toBe('each_face');
    expect(selfDrawIdFor(OUR_TABLE)).toBe('each_double');
  });

  it('calls a hand made number custom', () => {
    const odd = withRuleChange(OUR_TABLE, { selfDrawEachMult: 3 });
    expect(selfDrawIdFor(odd)).toBe('custom');
  });

  it('suggests exactly one option to a table still deciding', () => {
    expect(SELF_DRAW_SPLITS.filter((split) => split.recommended)).toHaveLength(
      1,
    );
  });
});

describe('changing it on a table that was on a preset', () => {
  it('turns Our table into custom rules, and back again', () => {
    const changed = withRuleChange(OUR_TABLE, { selfDrawEachMult: 1 });
    expect(changed.preset).toBe('custom');
    // Back to two each is Our table again, not a custom set that happens to
    // match it.
    expect(withRuleChange(changed, { selfDrawEachMult: 2 }).preset).toBe(
      'our_table',
    );
  });
});

describe('a whole game recalculated on the lighter option', () => {
  const { players, hands } = AUG_19_2026_GAME;
  const selfDraws = hands.filter((hand) => hand.type === 'zi_mo').length;

  it('moves every self drawn hand and leaves the rest alone', () => {
    // Eight of the nineteen hands were self drawn, so the two readings of
    // this rule have to differ, and differ only there.
    expect(selfDraws).toBe(8);

    const twoEach = replay({ players, rules: OUR_TABLE, hands });
    const oneEach = replay({
      players,
      rules: withRuleChange(OUR_TABLE, { selfDrawEachMult: 1 }),
      hands,
    });

    expect(twoEach.scores).toEqual([-23, -39, 64, -2]);
    expect(oneEach.scores).toEqual([-18, -26, 33, 11]);
    // Still a zero sum game: nothing is created by paying less.
    expect(oneEach.scores.reduce((a, b) => a + b, 0)).toBe(0);
  });
});
