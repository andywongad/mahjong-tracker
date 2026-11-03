import { expect, test, type Page } from '@playwright/test';
import { openNewGame } from './newgame';

/**
 * The four-question guide, which lives inside the house rules now.
 *
 * It used to be one of two doors on home, which meant somebody who had never
 * kept score was asked "on a discard win, who pays?" before naming a single
 * player. It is the same four questions; it is just no longer the first thing
 * anyone meets.
 */

async function openGuide(page: Page) {
  await page.getByRole('button', { name: /^Change the house rules/ }).click();
  await page.getByRole('button', { name: 'Help me choose' }).click();
}

test('the guide is two deliberate taps inside the rules', async ({ page }) => {
  await openNewGame(page);
  await openGuide(page);

  await expect(
    page.getByRole('heading', { name: 'On a discard win, who pays?' }),
  ).toBeVisible();
});

test('what it settles lands on the rules it was opened from', async ({
  page,
}) => {
  await openNewGame(page);
  await openGuide(page);

  // The gentlest split and a straight curve is Everyone pays.
  await page
    .getByRole('button', { name: /Shooter pays double, others pay/ })
    .click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  // Scoped: the knowing door on home behind this sheet says "Straight to
  // the players and the house rules".
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Straight/ })
    .click();
  await page
    .getByRole('button', { name: 'Skip the rest and keep the usual' })
    .click();
  await page.getByRole('button', { name: 'Use these rules' }).click();

  // Back on the rules sheet, with the answer taken.
  await expect(
    page.getByRole('button', { name: /^Everyone pays/ }),
  ).toHaveAttribute('aria-pressed', 'true');

  // And applying carries it out to the game being started.
  await page.getByRole('button', { name: 'Apply rules' }).click();
  await expect(page.getByText('Everyone pays')).toBeVisible();
});

test('closing the guide goes back to the rules, not out', async ({ page }) => {
  await openNewGame(page);
  await openGuide(page);

  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close' })
    .click();

  await expect(page.getByRole('heading', { name: 'House rules' })).toBeVisible();
});

test('a named set goes on the game and into the list for the next one', async ({
  page,
}) => {
  await openNewGame(page);
  await openGuide(page);

  // An answer no preset covers, so it is the table's own and asks to be named.
  await page
    .getByRole('button', { name: /Only the shooter pays, at face value/ })
    .click();
  await page
    .getByRole('button', { name: 'Skip the rest and keep the usual' })
    .click();
  await page.getByLabel('Give these rules a name').fill('Friday night');
  await page.getByRole('button', { name: 'Use these rules' }).click();
  await page.getByRole('button', { name: 'Apply rules' }).click();

  await expect(page.getByText('Friday night')).toBeVisible();
});

test('a first game inherits nothing from the seeded sample', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /I know what I'm doing/ }).click();

  // Empty seats, and the app's own default rather than the sample's rules.
  await expect(
    page.getByPlaceholder('East, deals first', { exact: true }),
  ).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Start game' })).toBeDisabled();
  await expect(page.getByText('Hong Kong standard')).toBeVisible();
});

test('starting another game from history goes straight to the players', async ({
  page,
}) => {
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Start another game' }).click();

  await expect(
    page.getByPlaceholder('East, deals first', { exact: true }),
  ).toBeVisible();
});
