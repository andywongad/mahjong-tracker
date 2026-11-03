import { expect, test, type Page } from '@playwright/test';
import { openNewGame } from './newgame';

/**
 * P0-5: everything you can do to a game rather than in it.
 *
 * They used to be scattered — Rules in the header, End game early and Delete
 * as plain links under the table, Edit only from the history list — and
 * Delete sat in the open on two screens, which is the wrong amount of effort
 * for the one action here that tapping again will not undo.
 */

const menu = (page: Page) =>
  page.getByRole('button', { name: 'This game' });

async function startGame(page: Page) {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
}

test('the loose links are gone from the table and from home', async ({
  page,
}) => {
  await startGame(page);

  await expect(
    page.getByRole('button', { name: 'Delete this game' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /End game early/ }),
  ).toHaveCount(0);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('button', { name: 'Delete this game' }),
  ).toHaveCount(0);
});

test('the menu holds the rules, the players, ending and deleting', async ({
  page,
}) => {
  await startGame(page);
  await menu(page).click();

  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('button', { name: /House rules/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /Edit game/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /Delete game/ })).toBeVisible();
  // Nothing has been played yet, so there is nothing to call early.
  await expect(sheet.getByRole('button', { name: /End game early/ })).toHaveCount(
    0,
  );
});

test('deleting asks first, and cancelling leaves the game alone', async ({
  page,
}) => {
  await startGame(page);
  const url = page.url();

  await menu(page).click();
  await page.getByRole('button', { name: /^Delete game/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Delete this game?' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: /Delete game/ })).toBeVisible();

  // Closing and reopening does not come back still holding the question.
  await page.getByRole('button', { name: 'Close' }).last().click();
  await menu(page).click();
  await expect(
    page.getByRole('heading', { name: 'Delete this game?' }),
  ).toHaveCount(0);

  await expect(page).toHaveURL(url);
});

test('confirming deletes it and sends you home, with the way back', async ({
  page,
}) => {
  await startGame(page);

  await menu(page).click();
  await page.getByRole('button', { name: /^Delete game/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Start a game' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Deleted');
});

test('the rules still open, now from inside the menu', async ({ page }) => {
  await startGame(page);

  await menu(page).click();
  await page.getByRole('button', { name: /House rules/ }).click();

  await expect(
    page.getByRole('heading', { name: 'House rules' }),
  ).toBeVisible();
});

test('ending early is offered once there are hands to end after', async ({
  page,
}) => {
  await startGame(page);
  await page.getByRole('button', { name: /^Player A, / }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Zi Mo/ }).click();
  await page
    .getByRole('dialog')
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'How many faan?' }) })
    .getByRole('button', { name: '4' })
    .click();
  await page.getByRole('button', { name: 'Save hand 1' }).click();

  await menu(page).click();
  await page.getByRole('button', { name: /End game early/ }).click();

  await expect(page.getByText(/Game ended after 1 hand/)).toBeVisible();
});
