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

describe('which rules a new game starts with', () => {
  it('uses Hong Kong standard for a table that has never played here', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ rules: HK_STANDARD }),
    );
  });

  it('keeps playing the way the last game was played', async () => {
    const { onSave, user } = setup({
      lastRules: OUR_TABLE,
      lastRuleSetName: 'Everyone pays',
    });
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
