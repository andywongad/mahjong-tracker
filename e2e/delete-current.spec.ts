import { expect, test, type Page } from '@playwright/test';
import { openNewGame, TABLE } from './newgame';

/**
 * Deleting the game you are looking at, and getting it back.
 *
 * The confirmation is game-menu.spec's subject; this is about what happens
 * to the data afterwards — that undo restores the same game rather than a
 * copy of it, and that walking away from the offer really does leave it
 * deleted.
 */

async function startGame(page: Page) {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
}

async function deleteFromMenu(page: Page) {
  await page.getByRole('button', { name: 'This game' }).click();
  await page.getByRole('button', { name: /^Delete game/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
}

test('undo restores the same game, hands and all', async ({ page }) => {
  await startGame(page);
  const table = page.url();

  // A hand, so there is something to lose beyond the game itself.
  await page.getByRole('button', { name: new RegExp(`^${TABLE[0]}, `) }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Zi Mo/ }).click();
  await page
    .getByRole('dialog')
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'How many faan?' }) })
    .getByRole('button', { name: '4' })
    .click();
  await page.getByRole('button', { name: 'Save hand 1' }).click();

  await deleteFromMenu(page);
  await expect(page.getByRole('status')).toContainText('Deleted');

  await page.getByRole('button', { name: 'Undo' }).click();

  // Wait for the restore to land rather than racing the navigation: home
  // shows the game again as soon as it is back.
  await expect(
    page.getByRole('heading', { name: 'Current game' }),
  ).toBeVisible();

  // The same id, so its own link still works and the hand is still on it.
  await page.goto(table);
  await expect(
    page.getByRole('button', { name: new RegExp(`^${TABLE[0]}, `) }),
  ).toBeVisible();
  await expect(page.getByText('1 played')).toBeVisible();
});

test('left alone, the offer lapses and the game stays deleted', async ({
  page,
}) => {
  await startGame(page);
  await deleteFromMenu(page);
  await expect(page.getByRole('status')).toContainText('Deleted');

  // Walk away from the offer rather than taking it.
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  const listed = page.locator('section:has(h2:text-is("Games played")) li');
  await expect(listed).toHaveCount(1); // the seeded sample only
});

test('History sits with the current game, and is listed once', async ({
  page,
}) => {
  const reference = page.getByRole('navigation', { name: 'Reference' });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(
    reference.getByRole('button', { name: 'History' }),
  ).toBeVisible();

  await startGame(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Now it sits beside the current game instead, and has left the reference
  // row rather than appearing in both.
  const current = page.locator('section:has(h2:text-is("Current game"))');
  await expect(current.getByRole('button', { name: 'History' })).toBeVisible();
  await expect(reference.getByRole('button', { name: 'History' })).toHaveCount(
    0,
  );
});
