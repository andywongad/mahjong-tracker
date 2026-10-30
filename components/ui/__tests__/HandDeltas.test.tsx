// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HandDeltas, markFor } from '../HandDeltas';
import type { Hand } from '@/lib/scoring';

const DISCARD: Hand = {
  type: 'ceot_cung',
  winnerSeat: 0,
  discarderSeat: 1,
  faan: 4,
};
const SELF_DRAW: Hand = { type: 'zi_mo', winnerSeat: 2, faan: 4 };

describe('what a player was to a hand', () => {
  it('names the winner and the shooter on a discard win', () => {
    expect(markFor(DISCARD, 0)).toBe('won');
    expect(markFor(DISCARD, 1)).toBe('shooter');
    expect(markFor(DISCARD, 2)).toBeNull();
    expect(markFor(DISCARD, 3)).toBeNull();
  });

  it('names a self pick as its own thing, with nobody at fault', () => {
    expect(markFor(SELF_DRAW, 2)).toBe('self-pick');
    expect(markFor(SELF_DRAW, 0)).toBeNull();
    expect(markFor(SELF_DRAW, 1)).toBeNull();
  });

  it('names nobody on a hand nobody won', () => {
    for (const seat of [0, 1, 2, 3] as const) {
      expect(markFor({ type: 'draw' }, seat)).toBeNull();
      expect(markFor({ type: 'zaa_wu', offenderSeat: 3 }, seat)).toBeNull();
      expect(markFor(null, seat)).toBeNull();
    }
  });
});

describe('a hand’s four changes', () => {
  it('marks the winner and the shooter, each once', () => {
    render(<HandDeltas hand={DISCARD} deltas={[32, -16, -8, -8]} />);

    // The marks are filled chips, not colours, so they are findable without.
    const won = screen.getAllByText(/^Won,/);
    expect(won).toHaveLength(1);
    expect(won[0].parentElement).toHaveTextContent('+32');

    const shot = screen.getAllByText(/^Shooter,/);
    expect(shot).toHaveLength(1);
    expect(shot[0].parentElement).toHaveTextContent('-16');
  });

  it('marks a self pick differently, and marks no shooter', () => {
    render(<HandDeltas hand={SELF_DRAW} deltas={[-16, -16, 48, -16]} />);

    const self = screen.getAllByText(/^Self pick,/);
    expect(self).toHaveLength(1);
    expect(self[0].parentElement).toHaveTextContent('+48');
    expect(screen.queryByText(/^Shooter,/)).toBeNull();
    expect(screen.queryByText(/^Won,/)).toBeNull();
  });

  it('marks nobody on a draw', () => {
    render(<HandDeltas hand={{ type: 'draw' }} deltas={[0, 0, 0, 0]} />);
    expect(screen.getAllByText('0')).toHaveLength(4);
    expect(screen.queryByText(/^Won,/)).toBeNull();
    expect(screen.queryByText(/^Self pick,/)).toBeNull();
  });

  it('signs every number, marked or not', () => {
    render(<HandDeltas hand={SELF_DRAW} deltas={[-16, -16, 48, -16]} />);
    expect(screen.getByText('+48')).toBeVisible();
    expect(screen.getAllByText('-16')).toHaveLength(3);
  });
});
