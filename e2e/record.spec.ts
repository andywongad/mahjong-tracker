import { expect, test, type Page } from '@playwright/test';
import { chooseRuleSet, openNewGame } from './newgame';

/**
 * The record flow, end to end, for all four kinds of hand.
 *
 * It runs against a game started through the UI so the scores start at zero and
 * every number below is the arithmetic of one hand rather than of nineteen.
 */

/** Our table at 4 faan: one unit is 4 points. */
const UNIT = 4;

async function startGame(page: Page): Promise<void> {
  await openNewGame(page);
  // Said out loud rather than inherited: every number below is Everyone pays
  // arithmetic, where one unit is the hand's faan.
  await chooseRuleSet(page, 'Everyone pays');
  await page.getByRole('button', { name: 'Start game' }).click();
  // The new game opens on its own table.
  await expect(seat(page)).toBeVisible();
}

/**
 * The seat card for a player, which is the button that records their win.
 *
 * The whole card is the control now, and its name says who and where they
 * stand rather than which hand is next, so the hand number is no longer part
 * of finding it.
 */
function seat(page: Page, name = 'Player A') {
  return page.getByRole('button', { name: new RegExp(`^${name}, `) });
}

/** The draw and the false win, which live under the table now. */
async function otherOutcome(page: Page, choice: RegExp) {
  await page.getByRole('button', { name: 'Other outcome' }).click();
  await page.getByRole('dialog').getByRole('button', { name: choice }).click();
}

/** Every player's running total, read off the table rather than out of the store. */
async function scores(page: Page): Promise<Record<string, number>> {
  const cards = page.getByRole('button', { name: /^Player [A-D], / });
  const out: Record<string, number> = {};
  for (const card of await cards.all()) {
    const label = (await card.getAttribute('aria-label')) ?? '';
    const name = label.replace(/,.*$/, '');
    out[name] = Number(await card.locator('.tnum').first().innerText());
  }
  return out;
}

/** A seat button inside one of the sheet's questions. */
function pick(page: Page, question: string, name: string) {
  return page
    .getByRole('dialog')
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: question }) })
    .getByRole('button', { name });
}

test.describe('recording each kind of hand', () => {
  test('a discard win pays the winner from all three, the shooter double', async ({
    page,
  }) => {
    await startGame(page);

    await seat(page, 'Player A').click();
    await page.getByRole('button', { name: /Cheut Chung/ }).click();
    await pick(page, 'Who was the shooter?', 'Player B').click();
    await pick(page, 'How many faan?', '4').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

    // The shooter pays two units, the other two one each, the winner takes the sum.
    await expect
      .poll(() => scores(page))
      .toEqual({
        'Player A': UNIT * 4,
        'Player B': -UNIT * 2,
        'Player C': -UNIT,
        'Player D': -UNIT,
      });
  });

  test('a self drawn win takes the same from each loser', async ({ page }) => {
    await startGame(page);

    await seat(page, 'Player C').click();
    await page.getByRole('button', { name: /Zi Mo/ }).click();
    await pick(page, 'How many faan?', '4').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

    await expect
      .poll(() => scores(page))
      .toEqual({
        'Player A': -UNIT * 2,
        'Player B': -UNIT * 2,
        'Player C': UNIT * 6,
        'Player D': -UNIT * 2,
      });
  });

  test('a draw is one tap and changes nothing', async ({ page }) => {
    await startGame(page);

    await otherOutcome(page, /Draw/);

    await expect(seat(page)).toBeVisible();
    await expect
      .poll(() => scores(page))
      .toEqual({
        'Player A': 0,
        'Player B': 0,
        'Player C': 0,
        'Player D': 0,
      });
  });

  test('a false win pays a penalty to each of the other three', async ({
    page,
  }) => {
    await startGame(page);

    // One tap, from the seat of whoever called it. No winner is involved.
    await page
      .getByRole('button', { name: 'Other outcome' })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: /False win/ }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Player D/ })
      .click();

    // The penalty is a house rule, so the shape is asserted, not the amount.
    await expect
      .poll(async () => {
        const table = await scores(page);
        const penalty = table['Player A'];
        return {
          paidOut: penalty > 0,
          even: table['Player B'] === penalty && table['Player C'] === penalty,
          offender: table['Player D'] === -penalty * 3,
        };
      })
      .toEqual({ paidOut: true, even: true, offender: true });
  });

  test('a hand just recorded can be taken straight back', async ({ page }) => {
    await startGame(page);

    await otherOutcome(page, /Draw/);
    await expect(seat(page)).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(seat(page)).toBeVisible();
  });

  test('there is no way to record a draw or a false win with a winner', async ({
    page,
  }) => {
    await startGame(page);

    await seat(page, 'Player A').click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('button', { name: /Lau Guk/ })).toHaveCount(0);
    await expect(sheet.getByRole('button', { name: /Zaa Wu/ })).toHaveCount(0);
  });

  test('a false win asks who called it, and nothing else', async ({ page }) => {
    await startGame(page);

    await page.getByRole('button', { name: 'Other outcome' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /False win/ })
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Player B/ })
      .click();

    // Never who won, because nobody did: straight into the log once the
    // offender is named, and undoable from the toast like any other hand.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText(
      /Hand 1 saved · Player B -\d+/,
    );
    await expect(seat(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });
});

test.describe('reading the running score', () => {
  test('a hand can be held open, and every figure is one tap away', async ({
    page,
  }) => {
    await page.goto('/?view=stats&game=seed-aug-19-2026');
    await page.waitForLoadState('networkidle');

    const chart = page.locator('figure svg').first();
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    if (!box) throw new Error('No chart');

    // Dragging sideways runs along the game, and lifting leaves it where it
    // was left: a finger cannot hover, so holding is the only way to read it.
    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.25, y);
    await page.mouse.down();
    const caption = page.locator('figcaption');
    await expect(caption).toContainText(/Showing hand \d+/);
    const atStart = await caption.innerText();

    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 10 });
    // Which hand depends on how wide the chart is; that it moved does not.
    await expect(caption).not.toHaveText(atStart);
    await expect(caption).toContainText(/Showing hand \d+/);
    await page.mouse.up();

    const readout = page.getByRole('status').filter({ hasText: /After hand/ });
    await expect(readout).toBeVisible();
    await page.mouse.move(box.x + box.width * 0.1, y);
    await expect(readout).toBeVisible();

    // Tapping the hand being held is how you let it go.
    await page.mouse.click(box.x + box.width * 0.7, y);
    await expect(readout).toHaveCount(0);

    // One player on their own has room for a figure at every hand.
    const fig = page.locator('figure').first();
    await fig.getByRole('button', { name: 'Player A' }).click();
    await expect(fig.getByText('+18')).toBeVisible();
    await expect(fig.getByText('-85')).toBeVisible();
    await expect(fig.getByText(/Every hand Player A played/)).toBeVisible();

    // And back to all four, where those figures cannot fit.
    await fig.getByRole('button', { name: 'Player A' }).click();
    await expect(fig.getByText('+18')).toHaveCount(0);

    // Values is the answer to "what was the score at hand eleven".
    await page.getByRole('button', { name: 'values' }).click();
    const rows = page.locator('figure tbody tr');
    await expect(rows).toHaveCount(19);
    await expect(rows.last()).toContainText('+64');
  });
});

test.describe('the table carries no buttons of its own', () => {
  test('a seat card is one control, and the rare outcomes are elsewhere', async ({
    page,
  }) => {
    await startGame(page);

    // Four seats, four controls, nothing nested inside them.
    const seats = page.getByRole('button', { name: /^Player [A-D], / });
    await expect(seats).toHaveCount(4);
    for (const card of await seats.all()) {
      expect(await card.locator('button').count()).toBe(0);
    }

    // No Won or False win anywhere on the table.
    await expect(page.getByRole('button', { name: /^Won$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /False win/ })).toHaveCount(
      0,
    );
  });

  test('a win, a draw and a false win all go in through the new doors', async ({
    page,
  }) => {
    await startGame(page);

    await seat(page, 'Player A').click();
    await page.getByRole('button', { name: /Cheut Chung/ }).click();
    await pick(page, 'Who was the shooter?', 'Player B').click();
    await pick(page, 'How many faan?', '4').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

    await otherOutcome(page, /Draw/);
    await otherOutcome(page, /False win/);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Player C/ })
      .click();

    await expect(page.getByText('3 played')).toBeVisible();
  });
});

test.describe('the hint over the table', () => {
  test('says the seats are the way in, once, and can be waved away', async ({
    page,
  }) => {
    await startGame(page);
    const hint = page.getByText('Tap the winner’s seat to record a hand.');
    await expect(hint).toBeVisible();

    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(hint).toHaveCount(0);

    // And it stays gone, on this device, across a reload.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(hint).toHaveCount(0);
  });

  test('retires itself once a hand has been recorded', async ({ page }) => {
    await startGame(page);
    await expect(
      page.getByText('Tap the winner’s seat to record a hand.'),
    ).toBeVisible();

    await seat(page, 'Player A').click();
    await page.getByRole('button', { name: /Zi Mo/ }).click();
    await pick(page, 'How many faan?', '4').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

    await expect(
      page.getByText('Tap the winner’s seat to record a hand.'),
    ).toHaveCount(0);
  });
});

test.describe('taking a hand back', () => {
  test('restores the scores and the count exactly', async ({ page }) => {
    await startGame(page);

    // Two hands in, so undo is undoing the last of several rather than the
    // only one there has ever been.
    await seat(page, 'Player A').click();
    await page.getByRole('button', { name: /Zi Mo/ }).click();
    await pick(page, 'How many faan?', '4').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

    await seat(page, 'Player C').click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Cheut Chung/ })
      .click();
    await pick(page, 'Who was the shooter?', 'Player D').click();
    await pick(page, 'How many faan?', '5').click();
    await page.getByRole('button', { name: 'Save hand 2' }).click();
    await expect(page.getByText('2 played')).toBeVisible();

    const before = await scores(page);

    // A third, then take it straight back.
    await seat(page, 'Player B').click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Zi Mo/ })
      .click();
    await pick(page, 'How many faan?', '6').click();
    await page.getByRole('button', { name: 'Save hand 3' }).click();

    await expect(page.getByRole('status')).toContainText('Hand 3 saved');
    await expect(page.getByText('3 played')).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText('2 played')).toBeVisible();
    await expect.poll(() => scores(page)).toEqual(before);
  });

  test('names the hand and what it did to whoever it turned on', async ({
    page,
  }) => {
    await startGame(page);

    await seat(page, 'Player A').click();
    await page.getByRole('button', { name: /Zi Mo/ }).click();
    await pick(page, 'How many faan?', '4').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

    // Our table at 4 faan: a self drawn win takes two units from each of the
    // other three, so the winner is up 24.
    await expect(page.getByRole('status')).toHaveText(
      /Hand 1 saved · Player A \+24/,
    );

    // And a draw turned on nobody, so there is nobody to name.
    await otherOutcome(page, /Draw/);
    await expect(page.getByRole('status')).toHaveText(
      /Hand 2 saved · Nobody won/,
    );
  });
});
