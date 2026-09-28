import { describe, expect, it } from 'vitest';
import { PATTERNS, PATTERNS_BY_ID, TODO_ROMANISATION } from '../catalog';
import {
  availablePatterns,
  blockedReason,
  countOf,
  groupedByFaan,
  setPatternCount,
  totalFor,
  withSelfDrawBonus,
} from '../builder';
import { HK_STANDARD, OUR_TABLE, type Rules } from '@/lib/rules/types';

describe('the catalog', () => {
  it('has no duplicate ids', () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every pattern Chinese, English and a romanisation', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.zh, pattern.id).not.toBe('');
      expect(pattern.nameEn, pattern.id).not.toBe('');
      expect(pattern.jyutping, pattern.id).not.toBe('');
    }
  });

  it('only excludes patterns that exist', () => {
    for (const pattern of PATTERNS) {
      for (const id of pattern.excludes ?? []) {
        expect(PATTERNS_BY_ID[id], `${pattern.id} excludes ${id}`).toBeDefined();
      }
    }
  });

  it('carries the limit hands from the brief', () => {
    const limits = PATTERNS.filter((p) => p.limit).map((p) => p.id);
    expect(limits).toEqual([
      'big_three_dragons',
      'small_four_winds',
      'all_honors',
      'heavenly_hand',
      'earthly_hand',
      'thirteen_orphans',
      'big_four_winds',
      'nine_gates',
    ]);
  });

  it('flags uncertain romanisations against real patterns', () => {
    for (const todo of TODO_ROMANISATION) {
      expect(PATTERNS_BY_ID[todo.id], todo.id).toBeDefined();
      expect(todo.note.length).toBeGreaterThan(10);
    }
  });
});

describe('which patterns are offered', () => {
  it('hides the New 6 unless the rules ask for them', () => {
    const ids = availablePatterns(OUR_TABLE, false).map((p) => p.id);
    expect(ids).not.toContain('single_wait');
    expect(availablePatterns(HK_STANDARD, false).map((p) => p.id)).toContain('single_wait');
  });

  it('hides seven pairs unless the house rule is on', () => {
    expect(availablePatterns(OUR_TABLE, false).map((p) => p.id)).not.toContain(
      'seven_pairs',
    );
    const withHouseRule: Rules = { ...OUR_TABLE, sevenPairs: true };
    expect(availablePatterns(withHouseRule, false).map((p) => p.id)).toContain(
      'seven_pairs',
    );
  });

  it('only offers self draw patterns on a self drawn hand', () => {
    const notSelfDrawn = availablePatterns(HK_STANDARD, false).map((p) => p.id);
    expect(notSelfDrawn).not.toContain('self_drawn');
    expect(notSelfDrawn).not.toContain('fully_concealed_self_draw');
    expect(availablePatterns(HK_STANDARD, true).map((p) => p.id)).toContain('self_drawn');
  });

  it('hides the self draw bonus when the table does not give one', () => {
    // Our table has no self draw bonus, so the pattern would add nothing.
    expect(OUR_TABLE.selfDrawBonusFaan).toBe(0);
    expect(availablePatterns(OUR_TABLE, true).map((p) => p.id)).not.toContain('self_drawn');
  });
});

describe('exclusions', () => {
  it('drops all sequences when all triplets is chosen', () => {
    let picks = setPatternCount([], 'all_sequences', 1);
    picks = setPatternCount(picks, 'all_triplets', 1);
    expect(countOf(picks, 'all_sequences')).toBe(0);
    expect(countOf(picks, 'all_triplets')).toBe(1);
  });

  it('keeps only one of the suit patterns', () => {
    let picks = setPatternCount([], 'mixed_one_suit', 1);
    picks = setPatternCount(picks, 'full_flush', 1);
    expect(countOf(picks, 'mixed_one_suit')).toBe(0);
    picks = setPatternCount(picks, 'all_honors', 1);
    expect(countOf(picks, 'full_flush')).toBe(0);
    expect(countOf(picks, 'all_honors')).toBe(1);
  });

  it('keeps only one size of three dragons', () => {
    let picks = setPatternCount([], 'small_three_dragons', 1);
    picks = setPatternCount(picks, 'big_three_dragons', 1);
    expect(countOf(picks, 'small_three_dragons')).toBe(0);
  });

  it('keeps only one size of four winds', () => {
    let picks = setPatternCount([], 'small_four_winds', 1);
    picks = setPatternCount(picks, 'big_four_winds', 1);
    expect(countOf(picks, 'small_four_winds')).toBe(0);
  });

  it('has the fully concealed self draw stand in for its two parts', () => {
    let picks = setPatternCount([], 'concealed_hand', 1);
    picks = setPatternCount(picks, 'self_drawn', 1);
    picks = setPatternCount(picks, 'fully_concealed_self_draw', 1);
    expect(countOf(picks, 'concealed_hand')).toBe(0);
    expect(countOf(picks, 'self_drawn')).toBe(0);
    expect(countOf(picks, 'fully_concealed_self_draw')).toBe(1);
  });

  it('explains why a pattern is blocked', () => {
    const picks = setPatternCount([], 'all_triplets', 1);
    expect(blockedReason(PATTERNS_BY_ID.all_sequences, picks)).toBe(
      'Not with All triplets',
    );
    expect(blockedReason(PATTERNS_BY_ID.seat_wind, picks)).toBeNull();
  });

  it('blocks flowers against no flowers, both ways round', () => {
    const withFlower = setPatternCount([], 'own_flower', 1);
    expect(blockedReason(PATTERNS_BY_ID.no_flowers, withFlower)).toBe(
      'Not with Own flower',
    );
    const withNone = setPatternCount([], 'no_flowers', 1);
    expect(blockedReason(PATTERNS_BY_ID.own_flower, withNone)).toBe('Not with No flowers');
  });
});

describe('counting', () => {
  it('stacks a dragon triplet up to three', () => {
    let picks = setPatternCount([], 'dragon_triplet', 3);
    expect(countOf(picks, 'dragon_triplet')).toBe(3);
    picks = setPatternCount(picks, 'dragon_triplet', 9);
    expect(countOf(picks, 'dragon_triplet')).toBe(3);
  });

  it('does not stack a plain toggle', () => {
    const picks = setPatternCount([], 'seat_wind', 5);
    expect(countOf(picks, 'seat_wind')).toBe(1);
  });

  it('removes a pattern at zero', () => {
    let picks = setPatternCount([], 'seat_wind', 1);
    picks = setPatternCount(picks, 'seat_wind', 0);
    expect(picks).toEqual([]);
  });
});

describe('totals', () => {
  it('adds up faan, counting stacks', () => {
    let picks = setPatternCount([], 'dragon_triplet', 2); // 1 each
    picks = setPatternCount(picks, 'all_triplets', 1); // 3
    expect(totalFor(picks, OUR_TABLE).raw).toBe(5);
  });

  it('caps the saved faan and says so', () => {
    const picks = setPatternCount([], 'big_four_winds', 1); // 15 faan
    const total = totalFor(picks, OUR_TABLE);
    expect(total.raw).toBe(15);
    expect(total.faan).toBe(13);
    expect(total.capped).toBe(true);
  });

  it('marks a hand holding a limit pattern', () => {
    const picks = setPatternCount([], 'thirteen_orphans', 1);
    expect(totalFor(picks, OUR_TABLE).isLimit).toBe(true);
    expect(totalFor(setPatternCount([], 'seat_wind', 1), OUR_TABLE).isLimit).toBe(false);
  });

  it('flags a total below the table minimum', () => {
    const picks = setPatternCount([], 'seat_wind', 1); // 1 faan, minimum is 3
    expect(totalFor(picks, OUR_TABLE).belowMinimum).toBe(true);
  });

  it('takes the self draw bonus from the rules, not the catalog', () => {
    const picks = [{ id: 'self_drawn', count: 1 }];
    expect(totalFor(picks, HK_STANDARD).raw).toBe(1);
    const generous: Rules = { ...HK_STANDARD, selfDrawBonusFaan: 2 };
    expect(totalFor(picks, generous).raw).toBe(2);
  });

  it('ignores an unknown pattern rather than breaking', () => {
    expect(totalFor([{ id: 'nonsense', count: 1 }], OUR_TABLE).raw).toBe(0);
  });
});

describe('the self draw bonus', () => {
  it('is added for a self drawn hand when the table gives one', () => {
    const picks = withSelfDrawBonus([], HK_STANDARD, true);
    expect(countOf(picks, 'self_drawn')).toBe(1);
  });

  it('is not added when the hand was not self drawn', () => {
    expect(withSelfDrawBonus([], HK_STANDARD, false)).toEqual([]);
  });

  it('is not added when the table gives no bonus', () => {
    expect(withSelfDrawBonus([], OUR_TABLE, true)).toEqual([]);
  });

  it('is not added twice', () => {
    const once = withSelfDrawBonus([], HK_STANDARD, true);
    expect(withSelfDrawBonus(once, HK_STANDARD, true)).toHaveLength(1);
  });

  it('stays off when a pattern already covers the self draw', () => {
    const picks = setPatternCount([], 'fully_concealed_self_draw', 1);
    expect(withSelfDrawBonus(picks, HK_STANDARD, true)).toHaveLength(1);
  });
});

describe('grouping for the list', () => {
  it('orders groups by faan, lowest first', () => {
    const groups = groupedByFaan(availablePatterns(OUR_TABLE, false), OUR_TABLE);
    const faans = groups.map((g) => g.faan);
    expect(faans).toEqual([...faans].sort((a, b) => a - b));
  });

  it('puts every offered pattern in exactly one group', () => {
    const patterns = availablePatterns(HK_STANDARD, true);
    const grouped = groupedByFaan(patterns, HK_STANDARD).flatMap((g) => g.patterns);
    expect(grouped).toHaveLength(patterns.length);
  });
});
