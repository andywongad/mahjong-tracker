// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameSheet } from '../GameSheet';
import { HK_STANDARD, OUR_TABLE } from '@/lib/rules/types';
import type { PlayerNames } from '@/lib/scoring';

const NAMES = [
  'Player A',
  'Player B',
  'Player C',
  'Player D',
] as unknown as PlayerNames;

const SEATS = ['East, deals first', 'South', 'West', 'North'];

function setup(props: Partial<React.ComponentProps<typeof GameSheet>> = {}) {
  const onSave = vi.fn();
  render(
    <GameSheet
      open
      editing={null}
      lastPlayers={NAMES}
      onClose={vi.fn()}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave, user: userEvent.setup() };
}

/** A new game cannot start without four names, and they start empty. */
async function nameTheTable(user: ReturnType<typeof userEvent.setup>) {
  for (const [index, placeholder] of SEATS.entries()) {
    await user.type(screen.getByPlaceholderText(placeholder), NAMES[index]);
  }
}

describe('naming the table', () => {
  it('starts empty, even when the last group is known', () => {
    setup();
    // Prefilled names read as a decision already taken, and the mistake they
    // cause is starting a game under somebody else's name.
    for (const placeholder of SEATS) {
      expect(screen.getByPlaceholderText(placeholder)).toHaveValue('');
    }
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  });

  it('offers the last group as one tap', async () => {
    const { user } = setup();
    await user.click(
      screen.getByRole('button', {
        name: `Use last group: ${NAMES.join(', ')}`,
      }),
    );

    expect(screen.getByPlaceholderText(SEATS[0])).toHaveValue('Player A');
    expect(screen.getByRole('button', { name: 'Start game' })).toBeEnabled();
  });

  it('stops offering it once somebody has started typing', async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(SEATS[0]), 'Ann');

    // Offering to fill the fields in now is an offer to throw that away.
    expect(screen.queryByRole('button', { name: /Use last group/ })).toBeNull();
  });

  it('fills the names in from the game being edited', () => {
    setup({
      editing: {
        id: 'g1',
        date: '2026-08-19',
        players: NAMES,
        rules: OUR_TABLE,
        shareSlug: 's',
        hands: [],
        createdAt: '2026-08-19T00:00:00.000Z',
        updatedAt: '2026-08-19T00:00:00.000Z',
      },
    });
    expect(screen.getByDisplayValue('Player A')).toBeTruthy();
  });
});

describe('which rules a new game starts with', () => {
  it('uses Hong Kong standard for a table that has never played here', async () => {
    const { onSave, user } = setup();
    await nameTheTable(user);
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ rules: HK_STANDARD }),
    );
  });

  it('says so, so nobody has to go and look', () => {
    setup();
    expect(screen.getByText('Hong Kong standard')).toBeTruthy();
    expect(screen.getByText('(recommended)')).toBeTruthy();
  });

  it('keeps playing the way the last game was played', async () => {
    const { onSave, user } = setup({
      lastRules: OUR_TABLE,
      lastRuleSetName: 'Everyone pays',
    });
    await nameTheTable(user);
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rules: OUR_TABLE,
        ruleSetName: 'Everyone pays',
      }),
    );
  });

  it('leaves an existing game on the rules it was played under', async () => {
    const { onSave, user } = setup({
      editing: {
        id: 'g1',
        date: '2026-08-19',
        players: NAMES,
        rules: OUR_TABLE,
        ruleSetName: 'Everyone pays',
        shareSlug: 's',
        hands: [],
        createdAt: '2026-08-19T00:00:00.000Z',
        updatedAt: '2026-08-19T00:00:00.000Z',
      },
      lastRules: HK_STANDARD,
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ rules: OUR_TABLE }),
    );
  });
});

describe('the date', () => {
  it('is today, and folded away until it is wrong', async () => {
    const { user } = setup();
    expect(screen.getByText('Date: Today')).toBeTruthy();
    expect(screen.queryByLabelText('Date')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Change the date' }));
    expect(screen.getByLabelText('Date')).toBeTruthy();
  });
});

describe('the payout question', () => {
  it('is not asked at the front door', () => {
    setup();
    expect(
      screen.queryByRole('heading', { name: 'On a discard win, who pays?' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /Help me/ })).toBeNull();
  });
});
