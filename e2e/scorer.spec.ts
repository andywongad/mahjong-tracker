import { expect, test, type Page } from '@playwright/test';

/**
 * The hand scorer, end to end.
 *
 * It exists for a player who does not know what their hand is worth, so what
 * matters is that tapping the tiles they are holding produces the right faan
 * and that the number reaches the record sheet.
 */

async function openScorer(page: Page): Promise<void> {
  await page.goto('/?game=seed-aug-19-2026');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('button', { name: /Record hand \d+ won by Player A/ })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: /Zi Mo/ }).click();
  await page.getByRole('button', { name: 'Build a hand' }).click();
  await expect(
    page.getByRole('heading', { name: 'The winning hand' }),
  ).toBeVisible();
}

/** Every tile is on screen at once, so there is no tray to switch to. */
async function tap(page: Page, name: RegExp, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await page.getByRole('button', { name }).first().click();
  }
}

test('works a hand out from the tiles and hands the faan back', async ({
  page,
}) => {
  await openScorer(page);

  // Three green dragons, a pung of 2s, two runs and a pair of 9s.
  await tap(page, /^Add 2 characters/, 3);
  await tap(page, /^Add 4 characters/);
  await tap(page, /^Add 5 characters/);
  await tap(page, /^Add 6 characters/, 2);
  await tap(page, /^Add 7 characters/);
  await tap(page, /^Add 8 characters/);
  await tap(page, /^Add 9 characters/, 2);
  await tap(page, /^Add Green dragon/, 3);

  // It says the hand is finished, without moving a tile to prove it.
  await expect(page.getByText('14 of 14 tiles')).toBeVisible();
  await expect(page.getByText(/A complete hand/)).toBeVisible();

  // One suit plus a dragon is 3, the dragon pung 1, no flowers 1.
  const use = page.getByRole('button', { name: 'Use 5 faan' });
  await expect(use).toBeEnabled();
  await use.click();

  // Back in the record sheet with the faan filled in and ready to save.
  await expect(
    page.getByRole('button', { name: /Save hand \d+/ }),
  ).toBeEnabled();
  await expect(page.getByText(/Built from/)).toBeVisible();
});

test('keeps the reasons folded away until they are asked for', async ({
  page,
}) => {
  await openScorer(page);

  // Six of one suit is already a Full Flush, so there is a reason to show.
  await tap(page, /^Add 2 characters/, 3);
  await tap(page, /^Add 4 characters/);
  await tap(page, /^Add 5 characters/);
  await tap(page, /^Add 6 characters/);

  const toggle = page.getByRole('button', { name: /Why it is worth this/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Full flush')).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Full flush')).toBeVisible();
});

test('builds the hand on one row that never changes height', async ({
  page,
}) => {
  await openScorer(page);
  const box = page.locator('[style*="height: 56px"]').first();

  const empty = await box.boundingBox();
  await tap(page, /^Add 2 characters/, 3);
  const few = await box.boundingBox();
  await tap(page, /^Add 4 characters/);
  await tap(page, /^Add 5 characters/);
  await tap(page, /^Add 6 characters/, 2);
  await tap(page, /^Add 7 characters/);
  await tap(page, /^Add 8 characters/);
  await tap(page, /^Add 9 characters/, 2);
  await tap(page, /^Add Green dragon/, 3);
  const full = await box.boundingBox();

  // Fourteen tiles fit beside each other rather than wrapping, so nothing
  // under the hand moves while it is being built.
  expect(empty?.height).toBe(56);
  expect(few?.height).toBe(56);
  expect(full?.height).toBe(56);
});

test('will not take a hand that is not a hand', async ({ page }) => {
  await openScorer(page);

  // Fourteen tiles that make no sets at all.
  for (const rank of ['1', '2', '4', '5', '7', '8']) {
    await tap(page, new RegExp(`^Add ${rank} dots`));
  }
  for (const rank of ['1', '2', '4', '5', '7', '8']) {
    await tap(page, new RegExp(`^Add ${rank} bamboo`));
  }
  await tap(page, /^Add 1 characters/);
  await tap(page, /^Add 3 characters/);

  await expect(
    page.getByText(/do not make four sets and a pair/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Finish the hand' }),
  ).toBeDisabled();
});

test('counts a kong as a fifteenth tile', async ({ page }) => {
  await openScorer(page);

  await tap(page, /^Add 5 dots/, 4);
  await expect(page.getByText('4 of 15 tiles')).toBeVisible();
  await expect(page.getByText(/a kong adds one/)).toBeVisible();
});

test('the patterns tab is still there for anyone who knows the hand', async ({
  page,
}) => {
  await openScorer(page);
  await page.getByRole('tab', { name: 'I know the patterns' }).click();
  await expect(page.getByText(/already know the hand/)).toBeVisible();
});
