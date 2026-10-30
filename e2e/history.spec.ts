import { expect, test, type Page } from '@playwright/test';

/**
 * History is paged, because a group that plays weekly has a long list by the
 * end of a year and only ever looks at the last few nights.
 */

const FIRST_PAGE = 5;

async function startGames(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    // Games are started from home, and starting one opens its table, so each
    // round trip goes back to home rather than clicking its way there.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Start a game' }).click();
    await page.getByRole('button', { name: 'Start game' }).click();
    // Saving opens the new game's table. Waiting for that rather than for a
    // moment keeps the next loop from navigating over the write.
    await page.waitForURL(/\?game=/);
  }
}

function listed(page: Page) {
  return page.locator('section:has(h2:text-is("Games played")) li');
}

test('history shows a few games, then more on request', async ({ page }) => {
  // The seeded game plus seven, so there is more than one page but not two.
  await startGames(page, 7);

  // Starting a game opens its table, so history is where we go to read it.
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await expect(listed(page)).toHaveCount(FIRST_PAGE);

  const more = page.getByRole('button', { name: /Show \d+ more/ });
  await expect(more).toHaveText('Show 3 more');
  await more.click();

  await expect(listed(page)).toHaveCount(8);
  await expect(more).toHaveCount(0);

  // And back again, so a long list can be put away.
  await page.getByRole('button', { name: 'Show fewer' }).click();
  await expect(listed(page)).toHaveCount(FIRST_PAGE);
});

test('a short history has nothing to expand', async ({ page }) => {
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');

  await expect(listed(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Show \d+ more/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Show fewer' })).toHaveCount(0);
});
