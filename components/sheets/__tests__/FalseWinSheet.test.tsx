// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FalseWinSheet } from '../FalseWinSheet';
import { OUR_TABLE } from '@/lib/rules/types';
import type { GameRecord } from '@/lib/game/types';

const GAME: GameRecord = {
  id: 'g1',
  date: '2026-08-19',
  players: ['Player A', 'Player B', 'Player C', 'Player D'],
  rules: OUR_TABLE,
  shareSlug: 'slug',
  hands: [],
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

function setup() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <FalseWinSheet
      open
      game={GAME}
      handNumber={7}
      onClose={onClose}
      onSave={onSave}
    />,
  );
  return { onSave, onClose, user: userEvent.setup() };
}

describe('recording a false win', () => {
  it('asks one question and nothing else', () => {
    setup();
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings).toEqual(['Hand 7: Zaa Wu', 'Who called it?']);
  });

  it('never offers a winner', () => {
    setup();
    expect(screen.queryByRole('heading', { name: /who won/i })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: /how many faan/i }),
    ).toBeNull();
  });

  it('saves the offender in two taps', async () => {
    const { onSave, user } = setup();

    expect(
      screen.getByRole('button', { name: 'Pick who called it' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Player D/ }));
    await user.click(screen.getByRole('button', { name: 'Save hand 7' }));

    expect(onSave).toHaveBeenCalledWith({ type: 'zaa_wu', offenderSeat: 3 });
  });
});
