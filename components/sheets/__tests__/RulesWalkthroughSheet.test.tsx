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
  it('opens on it, with nothing chosen for the table', () => {
    setup();

    expect(
      screen.getByRole('heading', { name: 'On a discard win, who pays?' }),
    ).toBeTruthy();
    expect(screen.getByText('Question 1 of 4')).toBeTruthy();
    // Not even the rules the sheet was opened on. This question has no right
    // answer, so arriving with one ticked would answer it for them.
    for (const button of screen.getAllByRole('button', {
      name: /pays the winner/,
    })) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('waits for an answer before it will go on', async () => {
    const { user } = setup();
    expect(next()).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at face/ }),
    );

    expect(next()).toBeEnabled();
    await user.click(next());
    expect(
      screen.getByRole('heading', {
        name: 'How much more is a better hand worth?',
      }),
    ).toBeTruthy();
  });

  it('offers all four ways a table can split it, gentlest first', () => {
    setup();

    // Ascending by what actually changes hands: one unit, two, four, four.
    const labels = [
      /Only the shooter pays, at face value/,
      /Only the shooter pays, at double/,
      /Shooter pays double, others pay one each/,
      /Only the shooter pays, the full amount/,
    ];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }

    // In that order, so the one a new table should take comes first.
    const order = screen
      .getAllByRole('button', { name: /pays the winner/ })
      .map((button) => button.textContent ?? '');
    expect(order).toHaveLength(labels.length);
    labels.forEach((label, index) => expect(order[index]).toMatch(label));
  });

  it('marks the gentlest one as the suggestion without choosing it', () => {
    setup();

    const suggested = screen.getByRole('button', {
      name: /Only the shooter pays, at face value/,
    });
    // Said in words, not just drawn as a colour.
    expect(suggested.textContent).toMatch(/Recommended for beginners/);
    // A suggestion is not a selection: the table still has to agree to it.
    expect(suggested).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the suggestion marked once it has been taken', async () => {
    const { user } = setup();
    const suggested = () =>
      screen.getByRole('button', {
        name: /Only the shooter pays, at face value/,
      });

    await user.click(suggested());

    expect(suggested()).toHaveAttribute('aria-pressed', 'true');
    expect(suggested().textContent).toMatch(/Recommended for beginners/);
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

describe('the curve question', () => {
  it('leads with the one a new table can follow, marked and unchosen', async () => {
    const { user } = setup();
    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at double/ }),
    );
    await user.click(next());

    const order = screen
      .getAllByRole('button', { name: /pays the winner/ })
      .map((button) => button.textContent ?? '');
    expect(order[0]).toMatch(/Straight/);
    expect(order[1]).toMatch(/Doubling/);

    const straight = screen.getByRole('button', { name: /Straight/ });
    expect(straight.textContent).toMatch(/Recommended for beginners/);
    // Suggested, and neither one chosen until the table says so.
    expect(straight).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Doubling/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(next()).toBeDisabled();
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
    await user.click(screen.getByRole('button', { name: /Doubling/ }));
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
    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at double/ }),
    );
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

    await user.click(
      screen.getByRole('button', { name: /Only the shooter pays, at double/ }),
    );
    await user.click(next());
    await user.click(screen.getByRole('button', { name: /Doubling/ }));
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
