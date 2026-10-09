// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeatCard } from '../SeatCard';

function setup(props: Partial<React.ComponentProps<typeof SeatCard>> = {}) {
  const onSelect = vi.fn();
  const onFalseWin = vi.fn();
  render(
    <SeatCard
      seat={0}
      name="Player A"
      score={-23}
      lastDelta={16}
      isDealer={false}
      onSelect={onSelect}
      selectLabel="Record hand 20 won by Player A"
      onFalseWin={onFalseWin}
      falseWinLabel="Record hand 20 as a false win called by Player A"
      {...props}
    />,
  );
  return { onSelect, onFalseWin, user: userEvent.setup() };
}

describe('a seat at the table', () => {
  it('offers winning and calling a false win as separate actions', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Record hand 20 won by Player A' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Record hand 20 as a false win called by Player A',
      }),
    ).toBeVisible();
  });

  it('never nests one action inside the other', () => {
    const { container } = render(
      <SeatCard
        seat={1}
        name="Player B"
        score={0}
        lastDelta={0}
        isDealer
        onSelect={vi.fn()}
        onFalseWin={vi.fn()}
      />,
    );
    // A button inside a button is invalid, and swallows the inner one's taps.
    expect(container.querySelectorAll('button button')).toHaveLength(0);
  });

  it('records a win from the body', async () => {
    const { onSelect, onFalseWin, user } = setup();
    await user.click(
      screen.getByRole('button', { name: 'Record hand 20 won by Player A' }),
    );
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onFalseWin).not.toHaveBeenCalled();
  });

  it('records a false win without going through a winner', async () => {
    const { onSelect, onFalseWin, user } = setup();
    await user.click(
      screen.getByRole('button', {
        name: 'Record hand 20 as a false win called by Player A',
      }),
    );
    expect(onFalseWin).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
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
    expect(screen.getByText('64')).toBeVisible();
  });
});
