// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TallySummary } from '../TallySummary';
import { OUR_TABLE, type Rules } from '@/lib/rules/types';
import type { GameRecord } from '@/lib/game/types';
import type { Hand } from '@/lib/scoring';
import {
  AUG_19_2026_HANDS,
  AUG_19_2026_PLAYERS,
} from '@/lib/scoring/fixtures/aug-19-2026';

function game(hands: readonly Hand[], rules: Rules = OUR_TABLE): GameRecord {
  return {
    id: 'g1',
    date: '2026-08-19',
    players: AUG_19_2026_PLAYERS,
    rules,
    shareSlug: 'slug',
    hands: hands.map((hand, index) => ({
      ...hand,
      id: `h${index}`,
      seq: index,
    })),
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
  };
}

/**
 * The four figures, left to right. The component renders two grids, the names
 * and then the totals, so the figures are the second one.
 */
function columns() {
  const grids = document.querySelectorAll('div.grid');
  const totals = grids[grids.length - 1];
  if (!totals) throw new Error('No tally grid');
  return [...totals.children].map((cell) => cell.textContent ?? '');
}

describe('the tally', () => {
  it('shows the reference game in seat order, not ranked order', () => {
    render(<TallySummary game={game(AUG_19_2026_HANDS)} />);
    // The seats run Player A, B, C, D; the scores are -23, -39, +64, -2.
    expect(columns()).toEqual(['-23', '-39', '+64', '-2']);
  });

  it('names the columns so a long log reads from the bottom', () => {
    render(<TallySummary game={game(AUG_19_2026_HANDS)} />);
    for (const name of AUG_19_2026_PLAYERS) {
      expect(screen.getByText(name)).toBeVisible();
    }
  });

  it('shows money beside the points once a stake is set', () => {
    const staked: Rules = { ...OUR_TABLE, baseUnit: 0.5, currency: '$' };
    render(<TallySummary game={game(AUG_19_2026_HANDS, staked)} />);
    // -23 points at 50 cents.
    expect(screen.getByText('-$11.50')).toBeVisible();
    expect(screen.getByText('$32')).toBeVisible();
  });

  it('shows no money at all when there is no stake', () => {
    render(<TallySummary game={game(AUG_19_2026_HANDS)} />);
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('always balances to zero', () => {
    render(<TallySummary game={game(AUG_19_2026_HANDS)} />);
    const total = columns().reduce((sum, text) => sum + Number(text), 0);
    expect(total).toBe(0);
  });

  it('balances in money too', () => {
    const staked: Rules = { ...OUR_TABLE, baseUnit: 0.5, currency: '$' };
    render(<TallySummary game={game(AUG_19_2026_HANDS, staked)} />);
    const cents = columns().map((text) => {
      const money = /(-?)\$([\d.]+)/.exec(text);
      if (!money) return 0;
      return Math.round(Number(money[2]) * 100) * (money[1] ? -1 : 1);
    });
    expect(cents.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('reads zero for a game with no hands', () => {
    render(<TallySummary game={game([])} />);
    expect(columns()).toEqual(['0', '0', '0', '0']);
  });

  it('is labelled, so the row is not four loose numbers', () => {
    const { container } = render(
      <TallySummary game={game(AUG_19_2026_HANDS)} />,
    );
    expect(within(container).getByText('Tally')).toBeVisible();
  });
});
