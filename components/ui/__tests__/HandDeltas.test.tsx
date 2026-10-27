// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HandDeltas, shooterSeatOf } from '../HandDeltas';
import type { Hand } from '@/lib/scoring';

const DISCARD: Hand = {
  type: 'ceot_cung',
  winnerSeat: 0,
  discarderSeat: 1,
  faan: 4,
};
const SELF_DRAW: Hand = { type: 'zi_mo', winnerSeat: 2, faan: 4 };

describe('finding the shooter', () => {
  it('is the discarder on a hand won off a discard', () => {
    expect(shooterSeatOf(DISCARD)).toBe(1);
  });

  it('is nobody on any other kind of hand', () => {
    expect(shooterSeatOf(SELF_DRAW)).toBeNull();
    expect(shooterSeatOf({ type: 'draw' })).toBeNull();
    expect(shooterSeatOf({ type: 'zaa_wu', offenderSeat: 3 })).toBeNull();
    // Still being filled in.
    expect(shooterSeatOf(null)).toBeNull();
  });
});

describe('a hand’s four changes', () => {
  it('marks the shooter and nobody else', () => {
    render(<HandDeltas hand={DISCARD} deltas={[32, -16, -8, -8]} />);

    // The mark is a filled chip, not a colour, so it is findable without one.
    const chips = screen.getAllByText(/Shooter,/);
    expect(chips).toHaveLength(1);
    expect(chips[0].parentElement).toHaveTextContent('-16');
  });

  it('leaves a self drawn hand unmarked, where all three pay the same', () => {
    render(<HandDeltas hand={SELF_DRAW} deltas={[-16, -16, 48, -16]} />);
    expect(screen.queryByText(/Shooter,/)).toBeNull();
  });

  it('still shows every player, signed, with zero as neutral', () => {
    render(<HandDeltas hand={{ type: 'draw' }} deltas={[0, 0, 0, 0]} />);
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('signs a win and a loss', () => {
    render(<HandDeltas hand={SELF_DRAW} deltas={[-16, -16, 48, -16]} />);
    expect(screen.getByText('+48')).toBeVisible();
    expect(screen.getAllByText('-16')).toHaveLength(3);
  });
});
