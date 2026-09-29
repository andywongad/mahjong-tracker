// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordHandSheet } from '../RecordHandSheet';
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

function setup(props: Partial<React.ComponentProps<typeof RecordHandSheet>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <RecordHandSheet
      open
      game={GAME}
      handNumber={1}
      editing={null}
      onClose={onClose}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave, onClose, user: userEvent.setup() };
}

/** The section for a step, so clicks land on the right set of buttons. */
function step(name: RegExp) {
  const heading = screen.getByRole('heading', { name });
  const section = heading.closest('section');
  if (!section) throw new Error(`No section for ${name}`);
  return within(section);
}

describe('recording a hand', () => {
  it('asks how the hand ended before anything else', () => {
    setup();
    expect(screen.getByRole('heading', { name: /how did the hand end/i })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /how many faan/i })).toBeNull();
  });

  it('saves a self drawn win', async () => {
    const { onSave, user } = setup();

    await user.click(step(/how did the hand end/i).getByRole('button', { name: /Zi Mo/ }));
    await user.click(step(/who won/i).getByRole('button', { name: /Player C/ }));
    await user.click(step(/how many faan/i).getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: /save hand/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zi_mo', winnerSeat: 2, faan: 5 }),
    );
  });

  it('saves a discard win, recording who dealt in', async () => {
    const { onSave, user } = setup();

    await user.click(
      step(/how did the hand end/i).getByRole('button', { name: /Cheut Chung/ }),
    );
    await user.click(step(/who won/i).getByRole('button', { name: /Player A/ }));
    await user.click(step(/who dealt in/i).getByRole('button', { name: /Player B/ }));
    await user.click(step(/how many faan/i).getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: /save hand/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ceot_cung', winnerSeat: 0, discarderSeat: 1, faan: 4 }),
    );
  });

  it('will not let the winner deal in to themselves', async () => {
    const { user } = setup();
    await user.click(
      step(/how did the hand end/i).getByRole('button', { name: /Cheut Chung/ }),
    );
    await user.click(step(/who won/i).getByRole('button', { name: /Player A/ }));

    expect(step(/who dealt in/i).getByRole('button', { name: /Player A/ })).toBeDisabled();
  });

  it('keeps Save unavailable until the hand is complete', async () => {
    const { user } = setup();
    const save = () => screen.getByRole('button', { name: /save hand/i });

    expect(save()).toBeDisabled();
    await user.click(step(/how did the hand end/i).getByRole('button', { name: /Zi Mo/ }));
    expect(save()).toBeDisabled();
    await user.click(step(/who won/i).getByRole('button', { name: /Player C/ }));
    expect(save()).toBeDisabled();
    await user.click(step(/how many faan/i).getByRole('button', { name: '3' }));
    expect(save()).toBeEnabled();
  });

  it('previews what the hand does to all four players', async () => {
    const { user } = setup();
    await user.click(step(/how did the hand end/i).getByRole('button', { name: /Zi Mo/ }));
    await user.click(step(/who won/i).getByRole('button', { name: /Player C/ }));
    await user.click(step(/how many faan/i).getByRole('button', { name: '5' }));

    // Our table: a 5 faan self draw takes 10 from each and pays 30.
    expect(screen.getByText('+30')).toBeVisible();
    expect(screen.getAllByText('-10')).toHaveLength(3);
  });

  it('needs only the offender for a false win', async () => {
    const { onSave, user } = setup();
    await user.click(step(/how did the hand end/i).getByRole('button', { name: /Zaa Wu/ }));
    await user.click(step(/who called it/i).getByRole('button', { name: /Player D/ }));
    await user.click(screen.getByRole('button', { name: /save hand/i }));

    expect(onSave).toHaveBeenCalledWith({ type: 'zaa_wu', offenderSeat: 3 });
  });

  it('saves a draw with nothing else asked', async () => {
    const { onSave, user } = setup();
    await user.click(step(/how did the hand end/i).getByRole('button', { name: /Lau Guk/ }));
    await user.click(screen.getByRole('button', { name: /save hand/i }));

    expect(onSave).toHaveBeenCalledWith({ type: 'draw' });
  });
});

describe('when a seat was tapped on the table', () => {
  it('starts with that player already chosen', () => {
    setup({ presetSeat: 2 });
    expect(screen.getByText('Player C')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /who won/i })).toBeNull();
  });

  it('lets the wrong tap be corrected without starting over', async () => {
    const { user } = setup({ presetSeat: 2 });
    await user.click(screen.getByRole('button', { name: /change/i }));
    expect(screen.getByRole('heading', { name: /who won/i })).toBeVisible();
  });

  it('treats the tapped player as the offender on a false win', async () => {
    const { onSave, user } = setup({ presetSeat: 1 });
    await user.click(step(/how did the hand end/i).getByRole('button', { name: /Zaa Wu/ }));
    await user.click(screen.getByRole('button', { name: /save hand/i }));

    expect(onSave).toHaveBeenCalledWith({ type: 'zaa_wu', offenderSeat: 1 });
  });
});
