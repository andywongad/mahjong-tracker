// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulesWalkthroughSheet } from '../RulesWalkthroughSheet';
import { DOUBLING_CURVE, HK_STANDARD, OUR_TABLE } from '@/lib/rules/types';

function setup(rules = HK_STANDARD) {
  const onApply = vi.fn();
  render(
    <RulesWalkthroughSheet
      open
      rules={rules}
      onClose={vi.fn()}
      onApply={onApply}
    />,
  );
  return { onApply, user: userEvent.setup() };
}

const next = () => screen.getByRole('button', { name: 'Next' });
const finish = () => screen.getByRole('button', { name: 'Use these rules' });
const skip = () =>
  screen.getByRole('button', { name: 'Skip the rest and keep the usual' });

describe('the discard question', () => {
  it('opens on it, with the current split already chosen', () => {
    setup();

    expect(
      screen.getByRole('heading', { name: 'On a discard win, who pays?' }),
    ).toBeTruthy();
    expect(screen.getByText('Question 1 of 4')).toBeTruthy();
    // Hong Kong standard is the shooter alone, at double.
    expect(
      screen.getByRole('button', { name: /Only the shooter pays, at double/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers all four ways a table can split it', () => {
    setup();

    for (const label of [
      /Shooter pays double, others pay one each/,
      /Only the shooter pays, at face value/,
      /Only the shooter pays, at double/,
      /Only the shooter pays, the full amount/,
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('quotes what each one costs rather than what it is called', () => {
    setup();
    // A 5 faan hand is 24 a unit on the doubling curve.
    const unit = DOUBLING_CURVE[5];

    expect(
      screen.getByRole('button', {
        name: new RegExp(
          `pays the winner ${unit * 4}: ${unit * 2} from the shooter and ${unit} from each`,
        ),
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: new RegExp(`pays the winner ${unit}: all of it from the shooter`),
      }),
    ).toBeTruthy();
  });
});

describe('what the answers add up to', () => {
  it('walks all four questions and applies them', async () => {
    const { onApply, user } = setup();

    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at face/ }),
    );
    await user.click(next());

    expect(
      screen.getByRole('heading', {
        name: 'How much more is a better hand worth?',
      }),
    ).toBeTruthy();
    await user.click(next());

    expect(
      screen.getByRole('heading', { name: 'How low and how high?' }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', {
        name: 'Increase Lowest hand you can win with',
      }),
    );
    await user.click(next());

    expect(
      screen.getByRole('heading', { name: 'Playing for money?' }),
    ).toBeTruthy();
    await user.click(next());
    await user.click(finish());

    const [rules] = onApply.mock.calls[0];
    expect(rules.discardShooterMult).toBe(1);
    expect(rules.discardOthersMult).toBe(0);
    expect(rules.minFaan).toBe(4);
  });

  it('gives a table the whole built-in way to play when its answers describe one', async () => {
    const { onApply, user } = setup();

    // Everyone pays is the shared split on a straight curve.
    await user.click(
      screen.getByRole('button', { name: /Shooter pays double, others pay/ }),
    );
    await user.click(next());
    await user.click(screen.getByRole('button', { name: /Straight/ }));
    await user.click(skip());
    await user.click(finish());

    expect(onApply).toHaveBeenCalledWith(OUR_TABLE, { name: 'Everyone pays' });
  });

  it('keeps the false win penalty worth a limit hand when the curve changes', async () => {
    const { onApply, user } = setup();
    expect(HK_STANDARD.zaaWuPenalty).toBe(DOUBLING_CURVE[13]);

    // The shooter-alone split with a straight curve is nobody's preset, so
    // the answers stand on their own — but the penalty still has to mean "a
    // limit hand", which on a straight curve to 13 is 13.
    await user.click(next());
    await user.click(screen.getByRole('button', { name: /Straight/ }));
    await user.click(skip());
    await user.click(finish());

    const [rules] = onApply.mock.calls[0];
    expect(rules.curve).toBe('linear');
    expect(rules.discardOthersMult).toBe(0);
    expect(rules.zaaWuPenalty).toBe(13);
  });
});

describe('naming what the answers added up to', () => {
  const field = () => screen.getByLabelText('Give these rules a name');

  it('asks for a name once the answers have left the presets behind', async () => {
    const { onApply, user } = setup();

    // The shooter alone at face value is nobody's preset.
    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at face/ }),
    );
    await user.click(skip());
    expect(screen.getByText('Your own rules')).toBeTruthy();

    await user.type(field(), 'Friday night');
    // The summary says what it is called as it is typed.
    expect(screen.getByText('Friday night')).toBeTruthy();

    await user.click(finish());
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ discardShooterMult: 1 }),
      { name: 'Friday night' },
    );
  });

  it('leaves the name out when it is left blank', async () => {
    const { onApply, user } = setup();

    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at face/ }),
    );
    await user.click(skip());
    await user.click(finish());

    expect(onApply).toHaveBeenCalledWith(expect.anything(), {
      name: undefined,
    });
  });

  it('does not ask a set that already has a name to be renamed', async () => {
    const { user } = setup();

    await user.click(skip());
    expect(screen.getByText('Hong Kong standard')).toBeTruthy();
    expect(
      screen.queryByLabelText('Give these rules a name'),
    ).toBeNull();
  });
});

describe('the ways past it', () => {
  it('skips to the summary keeping every untouched default', async () => {
    const { onApply, user } = setup();

    await user.click(skip());
    await user.click(finish());

    expect(onApply).toHaveBeenCalledWith(HK_STANDARD, {
      name: 'Hong Kong standard',
    });
  });

  it('names the built-in set it still matches, so the game is not labelled custom', async () => {
    const { onApply, user } = setup(OUR_TABLE);

    await user.click(skip());
    await user.click(finish());

    expect(onApply).toHaveBeenCalledWith(OUR_TABLE, { name: 'Everyone pays' });
  });

  it('turns money on with a stake and off again without one', async () => {
    const { onApply, user } = setup();

    await user.click(next());
    await user.click(next());
    await user.click(next());
    await user.click(screen.getByRole('button', { name: /Money too/ }));
    expect(
      screen.getByRole('button', { name: 'Increase Money per point' }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Just the score/ }));
    await user.click(next());
    await user.click(finish());

    const [rules] = onApply.mock.calls[0];
    expect(rules.baseUnit).toBe(0);
  });
});
