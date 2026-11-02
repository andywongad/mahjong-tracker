import { expect, test } from '@playwright/test';
import { openNewGame } from './newgame';

/**
 * Deleting the game you are sitting in.
 *
 * Asked twice, because it ejects you from the screen — and then offered back
 * on home, because by that point the screen the delete was made on is gone.
 */
test('the game at the table can be deleted, and comes back', async ({
  page,
}) => {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
  const table = page.url();

  // One tap arms it, and says what it is about to do.
  await page.getByRole('button', { name: 'Delete this game' }).click();
  await expect(
    page.getByRole('button', { name: 'Tap again to delete this game' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Tap again to delete this game' }).click();

  // Home, with the offer to put it back.
  await expect(page.getByRole('heading', { name: 'Start a game' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Deleted');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);

  // The same game, at the same address.
  await page.goto(table);
  await expect(
    page.getByRole('button', { name: /won by Player A/ }),
  ).toBeVisible();
});

test('a game deleted at the table is gone from history if left alone', async ({
  page,
}) => {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);

  await page.getByRole('button', { name: 'Delete this game' }).click();
  await page.getByRole('button', { name: 'Tap again to delete this game' }).click();
  await expect(page.getByRole('status')).toContainText('Deleted');

  // Walk away from the offer rather than taking it.
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  const listed = page.locator('section:has(h2:text-is("Games played")) li');
  await expect(listed).toHaveCount(1); // the seeded sample only
});

test('the current game can be deleted from home, and comes back', async ({
  page,
}) => {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
  const table = page.url();

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Current game' })).toBeVisible();

  // One tap from home, where the offer to put it back then appears.
  await page.getByRole('button', { name: 'Delete this game' }).click();
  await expect(
    page.getByRole('heading', { name: 'Current game' }),
  ).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Deleted');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Current game' })).toBeVisible();

  // The same game, at the same address.
  await page.goto(table);
  await expect(
    page.getByRole('button', { name: /won by Player A/ }),
  ).toBeVisible();
});

test('History shares the row with Delete, and is never listed twice', async ({
  page,
}) => {
  const reference = page.getByRole('navigation', { name: 'Reference' });

  // With no current game, History is one of the three reference buttons.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(
    reference.getByRole('button', { name: 'History' }),
  ).toBeVisible();

  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Now it sits beside Delete instead, and has left the reference row rather
  // than appearing in both.
  const row = page.locator('section:has(h2:text-is("Current game")) div', {
    has: page.getByRole('button', { name: 'Delete this game' }),
  });
  await expect(row.getByRole('button', { name: 'History' })).toBeVisible();
  await expect(reference.getByRole('button', { name: 'History' })).toHaveCount(
    0,
  );

  // And it still goes to history.
  await row.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});
