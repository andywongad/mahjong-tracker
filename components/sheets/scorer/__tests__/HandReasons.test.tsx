// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HandReasons } from '../HandReasons';
import { totalFor } from '@/lib/patterns/builder';
import { HK_STANDARD } from '@/lib/rules/types';
import type { HandPattern } from '@/lib/scoring';

const pick = (id: string, count = 1): HandPattern => ({ id, count });

/** The row that closes the arithmetic, wherever the list is shown. */
function totalRow() {
  const row = screen.getByText('Total faan').closest('li');
  if (!row) throw new Error('no total row');
  return within(row);
}

describe('the total under the points', () => {
  it('adds the listed faan up', () => {
    const picks = [pick('mixed_one_suit'), pick('seat_wind')];
    render(
      <HandReasons
        reasons={picks}
        rules={HK_STANDARD}
        total={totalFor(picks, HK_STANDARD)}
      />,
    );
    // 3 for the suit, 1 for the wind.
    expect(screen.getByText('+3')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
    expect(totalRow().getByText('4')).toBeTruthy();
  });

  it('counts a pattern taken more than once', () => {
    const picks = [pick('dragon_triplet', 2)];
    const total = totalFor(picks, HK_STANDARD);
    render(
      <HandReasons reasons={picks} rules={HK_STANDARD} total={total} />,
    );
    expect(screen.getByText('+2')).toBeTruthy();
    expect(totalRow().getByText('2')).toBeTruthy();
  });

  it('says so when the sum runs past the cap', () => {
    const rules = { ...HK_STANDARD, faanCap: 3 };
    const picks = [pick('mixed_one_suit'), pick('seat_wind')];
    render(
      <HandReasons
        reasons={picks}
        rules={rules}
        total={totalFor(picks, rules)}
      />,
    );
    // The sum is still shown, because that is what the column adds to.
    expect(totalRow().getByText('4')).toBeTruthy();
    expect(screen.getByText('capped at 3')).toBeTruthy();
  });

  it('marks a limit hand rather than leaving a bare number', () => {
    const picks = [pick('big_three_dragons')];
    render(
      <HandReasons
        reasons={picks}
        rules={HK_STANDARD}
        total={totalFor(picks, HK_STANDARD)}
      />,
    );
    expect(screen.getByText('Limit')).toBeTruthy();
    expect(screen.getByText('a limit hand')).toBeTruthy();
  });
});
