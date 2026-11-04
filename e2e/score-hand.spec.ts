import { expect, test, type Page } from '@playwright/test';

/**
 * Scoring a hand with no game going.
 *
 * The scorer inside a game is told the seat, the round and the deal. Here
 * nobody has told us, so the things that change the answer are asked for, and
 * the point of these tests is that changing them changes it.
 */

async function open(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Score a hand' }).click();
  await expect(
    page.getByRole('heading', { name: 'Score a hand' }),
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

/**
 * The list of reasons under the verdict.
 *
 * Scoped, because the flower tray now names what it is worth as you pick —
 * so "No flowers" and "Own flower" are on the screen twice on purpose: once
 * where the decision is made, once in the accounting.
 */
const reasons = (page: Page) => page.getByRole('list').first();

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

  await expect(reasons(page).getByText('Mixed one suit')).toBeVisible();
  await expect(reasons(page).getByText('Seat wind')).toBeVisible();
  await expect(reasons(page).getByText('No flowers')).toBeVisible();
});

test('clears the whole hand from beside it', async ({ page }) => {
  await open(page);
  await buildSouthPungHand(page);
  await expect(page.getByText('14 of 14 tiles')).toBeVisible();

  // Fourteen tiles back off one at a time is not a way out of a mis-tap.
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('0 of 14 tiles')).toBeVisible();
  await expect(verdict(page)).toContainText('Finish the hand');
});

test('a concealed hand is worth more, and more again if it was drawn', async ({
  page,
}) => {
  await open(page);
  await buildSouthPungHand(page);
  await expect(verdict(page)).toContainText('worth 4 faan');

  await page.getByLabel(/Concealed/).check();
  await expect(verdict(page)).toContainText('worth 5 faan');

  // Concealed and self drawn is one pattern, not the two of them added.
  await page.getByLabel(/Self drawn/).check();
  await expect(page.getByText('Fully concealed self draw')).toBeVisible();
  await expect(page.getByText('Concealed hand')).toHaveCount(0);
});

test('counts both number ones when a player holds the flower and the season', async ({
  page,
}) => {
  await open(page);
  await buildSouthPungHand(page);
  await expect(verdict(page)).toContainText('worth 4 faan');

  // Sitting East, so the number ones are theirs. Holding both is two faan,
  // which is the whole reason there are eight of these and not four.
  await page.getByRole('button', { name: /^Add Flower 1/ }).click();
  await expect(verdict(page)).toContainText('worth 4 faan');
  await page.getByRole('button', { name: /^Add Season 1/ }).click();
  await expect(verdict(page)).toContainText('worth 5 faan');
  await expect(reasons(page).getByText('Own flower')).toBeVisible();
});

test('marks the two bonus tiles that belong to this player', async ({
  page,
}) => {
  await open(page);

  // Sitting East, so the number ones are theirs and the other six are not.
  await expect(
    page.getByRole('button', { name: /^Add Flower 1, plum, your own/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Add Season 1, spring, your own/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Add Flower 2, orchid$/ }),
  ).toBeVisible();

  // Move seat and the mark moves with it.
  await page.getByRole('button', { name: 'My seat: South' }).click();
  await expect(
    page.getByRole('button', { name: /^Add Flower 2, orchid, your own/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Add Flower 1, plum$/ }),
  ).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test('fits a whole suit of nine on one row', async ({ page }) => {
    await open(page);

    const columns = await page.evaluate(() => {
      const grid = document.querySelector('main [style*="auto-fill"]');
      if (!grid) return 0;
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });

    // Nine across, so counting along a suit never crosses a row break.
    expect(columns).toBe(9);
  });
});

test.describe('whose flower is it', () => {
  const outcome = (page: Page) =>
    page.locator('main p').filter({ hasText: /無花|正花|爛花/ }).first();

  test('names what the flowers picked are worth, as they are picked', async ({
    page,
  }) => {
    await open(page);

    // Holding none is worth a faan, which a beginner would not guess.
    await expect(outcome(page)).toContainText('No flowers');
    await expect(outcome(page)).toContainText('+1 faan');

    // Somebody else's scores nothing — the case that used to highlight the
    // tile and then say nothing at all.
    await page.getByRole('button', { name: 'Add Flower 2, orchid' }).click();
    await expect(outcome(page)).toContainText('Broken flower');
    await expect(outcome(page)).toContainText('no faan');

    // Yours pays, and holding both the flower and the season pays twice.
    await page
      .getByRole('button', { name: 'Add Flower 1, plum, your own' })
      .click();
    await expect(outcome(page)).toContainText('Own flower');
    await expect(outcome(page)).toContainText('+1 faan');

    await page
      .getByRole('button', { name: 'Add Season 1, spring, your own' })
      .click();
    await expect(outcome(page)).toContainText('+2 faan');
  });

  test('sorts the tray by whose it is, rather than marking a corner', async ({
    page,
  }) => {
    await open(page);

    await expect(page.getByText('Yours')).toBeVisible();
    await expect(page.getByText(/Somebody else/)).toBeVisible();

    // Ownership is still said out loud, for anyone moving button to button
    // rather than seeing which half they are in.
    await expect(
      page.getByRole('button', { name: 'Add Flower 1, plum, your own' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add Flower 2, orchid' }),
    ).toBeVisible();
  });
});
