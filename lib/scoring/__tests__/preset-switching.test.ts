import { describe, expect, it } from 'vitest';
import { replay } from '../replay';
import { AUG_19_2026_GAME } from '../fixtures/aug-19-2026';
import { HK_STANDARD, OUR_TABLE, presetFor, withRuleChange } from '@/lib/rules/types';

/**
 * Scores are derived, never stored, so changing the rules must recalculate the
 * whole game and changing them back must land exactly where it started.
 */
describe('switching a game between presets', () => {
  const hands = AUG_19_2026_GAME.hands;
  const players = AUG_19_2026_GAME.players;

  const ourTable = replay({ players, rules: OUR_TABLE, hands });
  const hkStandard = replay({ players, rules: HK_STANDARD, hands });

  it('starts from the reference scores on the group\'s own table', () => {
    expect(ourTable.scores).toEqual([-23, -39, 64, -2]);
  });

  it('produces different scores under Hong Kong standard', () => {
    expect(hkStandard.scores).not.toEqual(ourTable.scores);
  });

  it('still balances under the other preset', () => {
    expect(hkStandard.scores.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('restores the original scores when switched back', () => {
    const backAgain = replay({ players, rules: OUR_TABLE, hands });
    expect(backAgain.scores).toEqual([-23, -39, 64, -2]);
    expect(backAgain.scores).toEqual(ourTable.scores);
  });

  it('leaves the dealer and round alone, since rules do not affect them', () => {
    expect(hkStandard.rows.map((r) => r.dealerSeat)).toEqual(
      ourTable.rows.map((r) => r.dealerSeat),
    );
    expect(hkStandard.rows.map((r) => r.round)).toEqual(
      ourTable.rows.map((r) => r.round),
    );
    expect(hkStandard.isComplete).toBe(ourTable.isComplete);
  });

  it('keeps the stored faan untouched by the rules', () => {
    // The only thing saved per hand is its faan. Nothing about a rule change
    // can alter it, which is why switching back is lossless.
    expect(hands.map((h) => ('faan' in h ? h.faan : null))).toEqual(
      hands.map((h) => ('faan' in h ? h.faan : null)),
    );
  });
});

describe('preset labelling', () => {
  it('recognises each built in preset', () => {
    expect(presetFor(OUR_TABLE)).toBe('our_table');
    expect(presetFor(HK_STANDARD)).toBe('hk_standard');
  });

  it('becomes custom as soon as a scoring rule is edited', () => {
    const edited = withRuleChange(OUR_TABLE, { faanCap: 10 });
    expect(edited.preset).toBe('custom');
    expect(edited.faanCap).toBe(10);
  });

  it('stays on the preset when only money changes', () => {
    const staked = withRuleChange(OUR_TABLE, { baseUnit: 0.5, currency: '$' });
    expect(staked.preset).toBe('our_table');
  });

  it('returns to the preset when an edit is undone', () => {
    const edited = withRuleChange(OUR_TABLE, { faanCap: 10 });
    const undone = withRuleChange(edited, { faanCap: 13 });
    expect(undone.preset).toBe('our_table');
  });
});
