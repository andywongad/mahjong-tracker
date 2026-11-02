import { expect, test } from '@playwright/test';
import { openNewGame, TABLE } from './newgame';

/**
 * Deleting a game.
 *
 * One tap from the list, and the way back is undo rather than a question
 * asked first — the same bargain the record flow strikes with a mis-tapped
 * hand.
 */

test('a game is one tap from gone, and one tap back', async ({ page }) => {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);

  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  const listed = page.locator('section:has(h2:text-is("Games played")) li');
  const before = await listed.count();

  // Delete is on the card itself, not behind Edit.
  await page
    .getByRole('button', { name: /^Delete / })
    .first()
    .click();
  await expect(listed).toHaveCount(before - 1);

  // And it offers the game straight back.
  await expect(page.getByRole('status')).toContainText('Deleted');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(listed).toHaveCount(before);
});

test('the game that comes back is the same game, hands and all', async ({
  page,
}) => {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
  const url = page.url();

  // Record a hand so there is something to lose.
  await page
    .getByRole('button', { name: new RegExp(`won by ${TABLE[0]}`) })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Zi Mo/ })
    .click();
  await page
    .getByRole('dialog')
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'How many faan?' }) })
    .getByRole('button', { name: '4' })
    .click();
  await page.getByRole('button', { name: 'Save hand 1' }).click();

  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('1 hand').first()).toBeVisible();

  await page
    .getByRole('button', { name: /^Delete / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Undo' }).click();

  // Same id, so the game's own link still works, and the hand is still on it.
  await expect(page.getByText('1 hand').first()).toBeVisible();
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: new RegExp(`won by ${TABLE[0]}`) }),
  ).toBeVisible();
});

