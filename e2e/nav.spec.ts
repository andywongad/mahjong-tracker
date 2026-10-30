import { expect, test, type Page } from '@playwright/test';

/**
 * The two bars at the top of every screen.
 *
 * The point of them is that they are the same everywhere: Home on the left,
 * Settings on the right, and History, Rules and Stats under the title. So
 * what is worth testing is that they are present and work from a screen that
 * has nothing to do with a game, and that where you already are says so.
 */

const SCREENS = [
  ['/', 'home'],
  ['/?view=games', 'history'],
  ['/?view=glossary', 'glossary'],
  ['/?view=score', 'score a hand'],
  ['/?game=seed-aug-19-2026', 'a game'],
  ['/?view=settle', 'tally details'],
] as const;

const header = (page: Page) => page.locator('header');

for (const [url, name] of SCREENS) {
  test(`${name} has the same chrome as everything else`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    await expect(header(page).getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(
      header(page).getByRole('button', { name: 'Settings' }),
    ).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Sections' });
    for (const button of ['History', 'Rules', 'Stats']) {
      await expect(nav.getByRole('button', { name: button })).toBeEnabled();
    }
  });
}

test('the rules of the game being played open from anywhere', async ({
  page,
}) => {
  // Not from the table: the point is that it reaches the current game from a
  // screen that is not it.
  await page.goto('/?view=glossary');
  await page.waitForLoadState('networkidle');

  await page
    .getByRole('navigation', { name: 'Sections' })
    .getByRole('button', { name: 'Rules' })
    .click();

  await expect(
    page.getByRole('dialog').getByText(/faan/i).first(),
  ).toBeVisible();
});

test('settings open from anywhere', async ({ page }) => {
  await page.goto('/?view=score');
  await page.waitForLoadState('networkidle');

  await page
    .locator('header')
    .getByRole('button', { name: 'Settings' })
    .click();

  await expect(
    page.getByRole('dialog').getByRole('radiogroup', { name: 'Appearance' }),
  ).toBeVisible();
});

test('stats reach the game you are playing from another screen', async ({
  page,
}) => {
  await page.goto('/?view=glossary');
  await page.waitForLoadState('networkidle');

  await page
    .getByRole('navigation', { name: 'Sections' })
    .getByRole('button', { name: 'Stats' })
    .click();

  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
});

test('the screen you are on marks itself rather than offering to go there', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(
    page.locator('header').getByRole('button', { name: 'Home' }),
  ).toHaveAttribute('aria-current', 'page');

  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'History' }),
  ).toHaveAttribute('aria-current', 'page');
});
