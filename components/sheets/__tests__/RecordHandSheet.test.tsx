// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordHandSheet } from '../RecordHandSheet';
import { OUR_TABLE } from '@/lib/rules/types';
import type { GameRecord } from '@/lib/game/types';
import type { HandRow } from '@/lib/scoring';

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

function setup(
  props: Partial<React.ComponentProps<typeof RecordHandSheet>> = {},
) {
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
  it('offers no way to record a hand nobody won', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Lau Guk/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Zaa Wu/ })).toBeNull();
  });

  it('asks who won before how they won', () => {
    setup();
    const headings = screen
      .getAllByRole('heading')
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Record hand 1',
      'Who won?',
      'How did they win?',
    ]);
  });

  it('saves a self drawn win', async () => {
    const { onSave, user } = setup();

    await user.click(
      step(/who won/i).getByRole('button', { name: /Player C/ }),
    );
    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Zi Mo/ }),
    );
    await user.click(step(/how many faan/i).getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: /save hand 1/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zi_mo', winnerSeat: 2, faan: 5 }),
    );
  });

  it('takes three taps and Save once the winner has been tapped on the table', async () => {
    const { onSave, user } = setup({ presetSeat: 2 });

    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Zi Mo/ }),
    );
    await user.click(step(/how many faan/i).getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: /save hand 1/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zi_mo', winnerSeat: 2, faan: 5 }),
    );
  });

  it('saves a discard win, recording the shooter', async () => {
    const { onSave, user } = setup({ presetSeat: 0 });

    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Cheut Chung/ }),
    );
    await user.click(
      step(/who was the shooter/i).getByRole('button', { name: /Player B/ }),
    );
    await user.click(step(/how many faan/i).getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: /save hand 1/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ceot_cung',
        winnerSeat: 0,
        discarderSeat: 1,
        faan: 4,
      }),
    );
  });

  it('will not let the winner be their own shooter', async () => {
    const { user } = setup({ presetSeat: 0 });
    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Cheut Chung/ }),
    );

    expect(
      step(/who was the shooter/i).getByRole('button', { name: /Player A/ }),
    ).toBeDisabled();
  });

  it('keeps the winner and a hand typed faan when the way of winning changes', async () => {
    const { onSave, user } = setup({ presetSeat: 2 });

    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Zi Mo/ }),
    );
    await user.click(step(/how many faan/i).getByRole('button', { name: '5' }));
    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Cheut Chung/ }),
    );
    await user.click(
      step(/who was the shooter/i).getByRole('button', { name: /Player D/ }),
    );
    await user.click(screen.getByRole('button', { name: /save hand 1/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ceot_cung',
        winnerSeat: 2,
        discarderSeat: 3,
        faan: 5,
      }),
    );
  });

  it('says what is missing rather than leaving Save greyed out and silent', async () => {
    const { user } = setup();

    expect(screen.getByRole('button', { name: 'Pick who won' })).toBeDisabled();
    await user.click(
      step(/who won/i).getByRole('button', { name: /Player C/ }),
    );

    expect(
      screen.getByRole('button', { name: 'Pick how they won' }),
    ).toBeDisabled();
    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Cheut Chung/ }),
    );

    expect(
      screen.getByRole('button', { name: 'Pick the shooter' }),
    ).toBeDisabled();
    await user.click(
      step(/who was the shooter/i).getByRole('button', { name: /Player A/ }),
    );

    expect(screen.getByRole('button', { name: 'Pick faan' })).toBeDisabled();
    await user.click(step(/how many faan/i).getByRole('button', { name: '3' }));

    expect(screen.getByRole('button', { name: 'Save hand 1' })).toBeEnabled();
  });

  it('previews what the hand does to all four players', async () => {
    const { user } = setup({ presetSeat: 2 });
    await user.click(
      step(/how did they win/i).getByRole('button', { name: /Zi Mo/ }),
    );
    await user.click(step(/how many faan/i).getByRole('button', { name: '5' }));

    // Our table: a 5 faan self draw takes 10 from each and pays 30.
    expect(screen.getByText('+30')).toBeVisible();
    expect(screen.getAllByText('-10')).toHaveLength(3);
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
});

describe('editing a hand', () => {
  const drawRow: HandRow = {
    index: 0,
    handNumber: 1,
    hand: { type: 'draw' },
    deltas: [0, 0, 0, 0],
    scoresAfter: [0, 0, 0, 0],
    round: 'east',
    roundIndex: 0,
    dealerSeat: 0,
    isExtra: false,
  };

  it('can still reach every kind of hand, so a wrong one can be corrected', () => {
    setup({ editing: drawRow });
    expect(
      screen.getByRole('heading', { name: /how did the hand end/i }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Lau Guk/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Zaa Wu/ })).toBeVisible();
  });

  it('drops the winner when a hand is corrected to a draw', async () => {
    const { onSave, user } = setup({ editing: drawRow });

    await user.click(
      step(/how did the hand end/i).getByRole('button', { name: /Zi Mo/ }),
    );
    await user.click(
      step(/who won/i).getByRole('button', { name: /Player B/ }),
    );
    await user.click(step(/how many faan/i).getByRole('button', { name: '3' }));
    await user.click(
      step(/how did the hand end/i).getByRole('button', { name: /Lau Guk/ }),
    );
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ type: 'draw' });
  });
});
