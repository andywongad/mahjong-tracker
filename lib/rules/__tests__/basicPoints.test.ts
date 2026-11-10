import { describe, expect, it } from 'vitest';
import { deltas, type Hand } from '@/lib/scoring';
import { BUILT_IN_RULE_SETS } from '../ruleSets';
import { HK_STANDARD, BASIC_POINTS, presetFor } from '../types';
import { splitIdFor } from '../discardSplits';
import { selfDrawIdFor } from '../selfDrawSplits';

/**
 * Hong Kong standard with the money flattened: what counts is unchanged, and
 * only what it pays is different. These pin both halves of that claim.
 */

describe('what it keeps from Hong Kong standard', () => {
  it('changes only the four things it means to', () => {
    const differences = (Object.keys(BASIC_POINTS) as (keyof typeof BASIC_POINTS)[])
      .filter((key) => BASIC_POINTS[key] !== HK_STANDARD[key])
      .sort();
    expect(differences).toEqual([
      'curve',
      'discardShooterMult',
      'preset',
      'zaaWuPenalty',
    ]);
  });

  it('keeps the counting: same range, self draw bonus and patterns', () => {
    expect(BASIC_POINTS.minFaan).toBe(3);
    expect(BASIC_POINTS.faanCap).toBe(13);
    expect(BASIC_POINTS.selfDrawBonusFaan).toBe(1);
    expect(BASIC_POINTS.newSix).toBe(true);
  });
});

describe('what it pays', () => {
  it('makes a hand worth its faan, paid once by the shooter', () => {
    const hand: Hand = {
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 7,
    };
    expect(deltas(hand, BASIC_POINTS)).toEqual([7, -7, 0, 0]);
  });

  it('takes that same number from each of the three on a self draw', () => {
    const hand: Hand = { type: 'zi_mo', winnerSeat: 2, faan: 7 };
    expect(deltas(hand, BASIC_POINTS)).toEqual([-7, -7, 21, -7]);
  });

  it('costs a limit hand for a false win, 13 to each', () => {
    const hand: Hand = { type: 'zaa_wu', offenderSeat: 3 };
    expect(deltas(hand, BASIC_POINTS)).toEqual([13, 13, 13, -39]);
  });

  it('is the pair of answers the rules sheet shows selected', () => {
    expect(splitIdFor(BASIC_POINTS)).toBe('shooter_face');
    expect(selfDrawIdFor(BASIC_POINTS)).toBe('each_face');
  });
});

describe('how it is named', () => {
  it('is a preset, so a game on it is never called custom', () => {
    expect(presetFor(BASIC_POINTS)).toBe('basic_points');
  });

  it('is offered first, ahead of the two it simplifies', () => {
    expect(BUILT_IN_RULE_SETS.map((set) => set.name)).toEqual([
      'Basic points',
      'Everyone pays',
      'Hong Kong standard',
    ]);
  });

  it('is offered as a built in set, and its rules are the preset', () => {
    const set = BUILT_IN_RULE_SETS.find((s) => s.id === 'builtin:basic_points');
    expect(set?.name).toBe('Basic points');
    expect(set?.rules).toEqual(BASIC_POINTS);
    expect(set?.builtIn).toBe(true);
  });
});
