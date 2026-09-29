import { expect, test, type Page } from '@playwright/test';

/**
 * The record flow, end to end, for all four kinds of hand.
 *
 * It runs against a game started through the UI so the scores start at zero and
 * every number below is the arithmetic of one hand rather than of nineteen.
 */

/** Our table at 4 faan: one unit is 4 points. */
const UNIT = 4;

async function startGame(page: Page): Promise<void> {
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Start a new game' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  // The new game opens on its own table.
  await expect(seat(page, 1)).toBeVisible();
}

/** The seat card for a player, which is also the button that records their win. */
function seat(page: Page, handNumber: number, name = 'Player A') {
  return page.getByRole('button', {
    name: `Record hand ${handNumber} won by ${name}`,
  });
}

/** Every player's running total, read off the table rather than out of the store. */
async function scores(page: Page): Promise<Record<string, number>> {
  const cards = page.getByRole('button', { name: /^Record hand \d+ won by / });
  const out: Record<string, number> = {};
  for (const card of await cards.all()) {
    const label = (await card.getAttribute('aria-label')) ?? '';
    const name = label.replace(/^Record hand \d+ won by /, '');
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

    await seat(page, 1, 'Player A').click();
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

    await seat(page, 1, 'Player C').click();
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

    await page.getByRole('button', { name: 'Draw', exact: true }).click();

    await expect(seat(page, 2)).toBeVisible();
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

    await page.getByRole('button', { name: 'False win', exact: true }).click();
    await pick(page, 'Who called it?', 'Player D').click();
    await page.getByRole('button', { name: 'Save hand 1' }).click();

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

    await page.getByRole('button', { name: 'Draw', exact: true }).click();
    await expect(seat(page, 2)).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(seat(page, 1)).toBeVisible();
  });

  test('there is no way to record a draw or a false win with a winner', async ({
    page,
  }) => {
    await startGame(page);

    await seat(page, 1, 'Player A').click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('button', { name: /Lau Guk/ })).toHaveCount(0);
    await expect(sheet.getByRole('button', { name: /Zaa Wu/ })).toHaveCount(0);
  });
});
