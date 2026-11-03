// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeatCard } from '../SeatCard';

function setup(props: Partial<React.ComponentProps<typeof SeatCard>> = {}) {
  const onSelect = vi.fn();
  render(
    <SeatCard
      seat={0}
      name="Player A"
      score={-23}
      lastDelta={16}
      isDealer={false}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { onSelect, user: userEvent.setup() };
}

describe('a seat at the table', () => {
  it('is one control, meaning one thing', () => {
    setup();
    // It used to carry two: a win and a false win, which put eight buttons on
    // the table and gave a once-a-night event the weight of an every-hand one.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('says who, where they sit, where they stand, and what tapping does', () => {
    setup();
    expect(
      screen.getByRole('button', {
        name: 'Player A, East, minus 23. Record a win for Player A.',
      }),
    ).toBeVisible();
  });

  it('reads a gain the way it would be said', () => {
    setup({ name: 'Player C', seat: 2, score: 64 });
    expect(
      screen.getByRole('button', { name: /Player C, West, plus 64\./ }),
    ).toBeVisible();
  });

  it('reads a level score as level rather than as nothing', () => {
    setup({ name: 'Player D', seat: 3, score: 0 });
    expect(
      screen.getByRole('button', { name: /Player D, North, level\./ }),
    ).toBeVisible();
  });

  it('records a win when the card is tapped', async () => {
    const { onSelect, user } = setup();
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('is inert once the game is over', () => {
    render(
      <SeatCard
        seat={2}
        name="Player C"
        score={64}
        lastDelta={-8}
        isDealer={false}
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    // Signed, always: a score read across a table must never be mistaken
    // for the wrong direction.
    expect(screen.getByText('+64')).toBeVisible();
  });
});
