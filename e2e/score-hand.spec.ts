import { expect, test, type Page } from '@playwright/test';

/**
 * Scoring a hand with no game going.
 *
 * The scorer inside a game is told the seat, the round and the deal. Here
 * nobody has told us, so the things that change the answer are asked for, and
 * the point of these tests is that changing them changes it.
 */

async function open(page: Page): Promise<void> {
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Score a hand' }).click();
  await expect(
    page.getByRole('heading', { name: "What's this hand worth?" }),
  ).toBeVisible();
}

/** Every tile is on screen at once, so there is no tray to switch to. */
async function tap(page: Page, name: RegExp, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await page.getByRole('button', { name }).first().click();
  }
}

/** One pung of South and a run of dots, so only the winds can move the score. */
async function buildSouthPungHand(page: Page) {
  await tap(page, /^Add South wind/, 3);
  for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
    await tap(page, new RegExp(`^Add ${rank} dots`));
  }
  await tap(page, /^Add 9 dots/, 3);
}

const verdict = (page: Page) =>
  page
    .locator('main p')
    .filter({ hasText: /worth|Finish/ })
    .first();

test('reaches the scorer from Games without a game', async ({ page }) => {
  await open(page);
  await expect(page.getByText('Hong Kong standard')).toBeVisible();
  await expect(verdict(page)).toContainText('Finish the hand');
  // Nothing about this is a game, and it says so.
  await expect(page.getByText(/Nothing here is recorded/)).toBeVisible();
});

test('the seat and the round change what the hand is worth', async ({
  page,
}) => {
  await open(page);
  await buildSouthPungHand(page);

  // Sitting East in an East round: the South pung belongs to nobody.
  await expect(verdict(page)).toContainText('worth 4 faan');

  await page.getByRole('button', { name: 'My seat: South' }).click();
  await expect(verdict(page)).toContainText('worth 5 faan');

  await page.getByRole('button', { name: 'Round: South' }).click();
  await expect(verdict(page)).toContainText('worth 6 faan');
});

test('self drawn follows whichever rules are chosen', async ({ page }) => {
  await open(page);
  await buildSouthPungHand(page);
  await expect(verdict(page)).toContainText('worth 4 faan');

  // Hong Kong standard pays a faan for a self draw; our table pays none.
  await page.getByLabel(/Self drawn/).check();
  await expect(verdict(page)).toContainText('worth 5 faan');
});

test('says why, because that is the whole point of asking', async ({
  page,
}) => {
  await open(page);
  await buildSouthPungHand(page);
  await page.getByRole('button', { name: 'My seat: South' }).click();

  await expect(page.getByText('Mixed one suit')).toBeVisible();
  await expect(page.getByText('Seat wind')).toBeVisible();
  await expect(page.getByText('No flowers')).toBeVisible();
});
