import { expect, test, type Page } from '@playwright/test';

/**
 * What the top of each screen carries.
 *
 * The rule: Settings is on every screen because it is about the app, and Home
 * on every screen but home itself. A game adds two things of its own — Rules,
 * which is to a game what Settings is to the app, and tabs for the two ways of
 * looking at that game. A screen with no game in it carries neither, because
 * they would be pointing at a game that is not on it.
 */

const GAME = '/?game=seed-aug-19-2026';
const STATS = '/?view=stats&game=seed-aug-19-2026';

const NO_GAME = [
  ['/?view=games', 'history'],
  ['/?view=glossary', 'glossary'],
  ['/?view=score', 'score a hand'],
  ['/?view=settle', 'tally details'],
  ['/?view=about', 'how this works'],
] as const;

const header = (page: Page) => page.locator('header');
const tabs = (page: Page) => page.getByRole('navigation', { name: 'This game' });

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

test('home carries settings and nothing that belongs to a game', async ({
  page,
}) => {
  await open(page, '/');

  await expect(header(page).getByRole('button', { name: 'Settings' })).toBeVisible();
  // The name block is the way home, and on home it is the page's heading
  // rather than a link to where you already are.
  await expect(
    header(page).getByRole('button', { name: /back to the start/ }),
  ).toHaveCount(0);
  await expect(
    header(page).getByRole('heading', { name: /Mahjong\s*Tracker/ }),
  ).toBeVisible();
  await expect(header(page).getByRole('button', { name: 'Rules' })).toHaveCount(0);
  await expect(tabs(page)).toHaveCount(0);
});

test('signing in is offered on home, beside settings, and nowhere else', async ({
  page,
}) => {
  await open(page, '/');
  await expect(header(page).getByRole('button', { name: 'Sign in' })).toBeVisible();

  await header(page).getByRole('button', { name: 'Sign in' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  // It says plainly that it is optional, because it is.
  await expect(sheet.getByText(/Optional/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();

  // Read once and then almost never, so it does not crowd the screens that
  // are used while playing.
  await open(page, GAME);
  await expect(header(page).getByRole('button', { name: 'Sign in' })).toHaveCount(0);
});

test('an address that is not one is refused before anything is sent', async ({
  page,
}) => {
  await open(page, '/');
  await header(page).getByRole('button', { name: 'Sign in' }).click();
  const sheet = page.getByRole('dialog');

  await sheet.getByPlaceholder('you@example.com').fill('not-an-address');
  await sheet.getByRole('button', { name: /Email me a link/ }).click();
  await expect(sheet.getByText(/does not look like an email/)).toBeVisible();
});

for (const [url, name] of NO_GAME) {
  test(`${name} carries the way out and nothing about a game`, async ({ page }) => {
    await open(page, url);

    // Getting home is the name block, not a button beside Settings.
    await expect(
      header(page).getByRole('button', { name: /back to the start/ }),
    ).toBeVisible();
    await expect(header(page).getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(header(page).getByRole('button', { name: 'Rules' })).toHaveCount(0);
    await expect(tabs(page)).toHaveCount(0);
  });
}

for (const [url, name] of [
  [GAME, 'the table'],
  [STATS, 'the stats'],
] as const) {
  test(`${name} carries its own rules and both tabs`, async ({ page }) => {
    await open(page, url);

    await expect(header(page).getByRole('button', { name: 'Rules' })).toBeVisible();
    await expect(tabs(page).getByRole('button', { name: 'Table' })).toBeVisible();
    await expect(tabs(page).getByRole('button', { name: 'Stats' })).toBeVisible();
  });
}

test('the tabs move between the two views of one game, and mark which', async ({
  page,
}) => {
  await open(page, GAME);
  await expect(tabs(page).getByRole('button', { name: 'Table' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await tabs(page).getByRole('button', { name: 'Stats' }).click();
  await expect(page).toHaveURL(/view=stats/);
  await expect(tabs(page).getByRole('button', { name: 'Stats' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // The same game, not whichever one was newest.
  await expect(page).toHaveURL(/game=seed-aug-19-2026/);

  await tabs(page).getByRole('button', { name: 'Table' }).click();
  await expect(page).toHaveURL(/game=seed-aug-19-2026/);
  await expect(page).not.toHaveURL(/view=stats/);
});

test("a game's rules open from its header", async ({ page }) => {
  await open(page, GAME);
  await header(page).getByRole('button', { name: 'Rules' }).click();
  await expect(page.getByRole('dialog').getByText(/faan/i).first()).toBeVisible();
});

test('settings open from anywhere', async ({ page }) => {
  await open(page, '/?view=score');
  await header(page).getByRole('button', { name: 'Settings' }).click();
  await expect(
    page.getByRole('dialog').getByRole('radiogroup', { name: 'Appearance' }),
  ).toBeVisible();
});

test('history is reached from home rather than from a game', async ({ page }) => {
  await open(page, '/');
  await page
    .getByRole('navigation', { name: 'Reference' })
    .getByRole('button', { name: 'History' })
    .click();
  await expect(page).toHaveURL(/view=games/);
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});

test('how this works is a place, not a dialog', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'How this works' }).click();

  await expect(page).toHaveURL(/view=about/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'How this works' })).toBeVisible();

  await page.getByRole('button', { name: /glossary/i }).click();
  await expect(page).toHaveURL(/view=glossary/);
});

test('the name block is the way home, from anywhere', async ({ page }) => {
  await open(page, GAME);

  const brand = header(page).getByRole('button', {
    name: /back to the start/,
  });
  await expect(brand).toBeVisible();
  await brand.click();

  await expect(
    page.getByRole('heading', { name: 'Start a game' }),
  ).toBeVisible();
});
