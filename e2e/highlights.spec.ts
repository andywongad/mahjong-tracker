import { expect, test } from '@playwright/test';
import { openNewGame } from './newgame';

/**
 * The few lines at the top of Stats that say how a night went.
 *
 * Only once the game is over, and only when there is something to say.
 */
test('a finished game is summed up before the tables that prove it', async ({
  page,
}) => {
  await page.goto('/?view=stats&game=seed-aug-19-2026');
  await page.waitForLoadState('networkidle');

  const section = page.locator('section', {
    has: page.getByRole('heading', { name: 'How it went' }),
  });
  await expect(section).toBeVisible();

  // The result leads, and the lines say things the tables below cannot.
  const lines = section.getByRole('listitem');
  await expect(lines.first()).toContainText('took the night on +64');
  await expect(lines).toHaveCount(4);

  // Above the summary table, which is the thing it is summarising.
  const headings = await page
    .getByRole('heading', { level: 2 })
    .allTextContents();
  expect(headings.indexOf('How it went')).toBeLessThan(
    headings.indexOf('Summary'),
  );
});

test('a game still being played is not called early', async ({ page }) => {
  await openNewGame(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
  const id = new URL(page.url()).searchParams.get('game');

  await page.goto(`/?view=stats&game=${id}`);
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'How it went' }),
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
});
