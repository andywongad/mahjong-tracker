// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ScoreTable } from '../ScoreTable';
import { replay } from '@/lib/scoring';
import { OUR_TABLE } from '@/lib/rules/types';
import {
  AUG_19_2026_HANDS,
  AUG_19_2026_PLAYERS,
} from '@/lib/scoring/fixtures/aug-19-2026';

const GAME = {
  players: AUG_19_2026_PLAYERS,
  rules: OUR_TABLE,
  hands: AUG_19_2026_HANDS.map((hand, index) => ({
    ...hand,
    id: `h${index}`,
    seq: index,
  })),
};

function renderTable() {
  const result = replay(GAME as never);
  render(
    <ScoreTable
      series={result.series}
      players={AUG_19_2026_PLAYERS}
      rounds={result.rows.map((row) => row.round)}
    />,
  );
  return result;
}

describe('the running score as numbers', () => {
  it('gives a row per hand, so every point on the line has a figure', () => {
    const result = renderTable();
    expect(screen.getAllByRole('row')).toHaveLength(result.handCount + 1);
  });

  it('ends on the scores the game actually finished with', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    const last = within(rows[rows.length - 1]);
    // The Aug 19 2026 fixture, which the engine tests also pin.
    expect(last.getByText('-23')).toBeVisible();
    expect(last.getByText('-39')).toBeVisible();
    expect(last.getByText('+64')).toBeVisible();
    expect(last.getByText('-2')).toBeVisible();
  });

  it('is a running total, not a per hand change', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    // Hand 1 is a 3 faan self draw by the first player: +18 and -6 each.
    expect(within(rows[1]).getByText('+18')).toBeVisible();
    // By hand 2 that has moved on rather than repeating.
    expect(within(rows[2]).getByText('+6')).toBeVisible();
  });

  it('names every player and signs every score', () => {
    renderTable();
    for (const name of AUG_19_2026_PLAYERS) {
      expect(screen.getByRole('columnheader', { name })).toBeVisible();
    }
    // A zero reads as neutral rather than as a gain.
    const rows = screen.getAllByRole('row');
    expect(within(rows[4]).getByText('0')).toBeVisible();
  });

  it('says which round each hand belonged to', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('東')).toBeVisible();
    expect(within(rows[19]).getByText('北')).toBeVisible();
  });
});
