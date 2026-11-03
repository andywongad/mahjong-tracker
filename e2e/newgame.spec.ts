import { expect, test } from '@playwright/test';

/**
 * P0-4: one front door.
 *
 * Home used to ask whether you were still learning or knew what you were
 * doing, and the learner's path opened on "On a discard win, who pays?" —
 * the question a beginner came here not knowing the answer to.
 */

const SEATS = ['East, deals first', 'South', 'West', 'North'];
const NAMES = ['Aaron', 'Jad', 'Dave', 'Jacky'];

test('home offers one way in, not a choice about yourself', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /still learning/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /know what I'm doing/ }),
  ).toHaveCount(0);
});

test('four names and one tap starts a game on standard rules', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'New game' }).click();

  // The rules are answered already, and say so.
  await expect(page.getByText('Hong Kong standard')).toBeVisible();
  await expect(page.getByText('(recommended)')).toBeVisible();

  for (const [index, placeholder] of SEATS.entries()) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(NAMES[index]);
  }
  await page.getByRole('button', { name: 'Start game' }).click();

  await page.waitForURL(/\?game=/);
  await expect(page.getByRole('button', { name: /^Aaron, / })).toBeVisible();
});

test('a payout question is never asked unless it is asked for', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'New game' }).click();

  const payout = page.getByRole('heading', {
    name: 'On a discard win, who pays?',
  });
  await expect(payout).toHaveCount(0);

  // It is two deliberate taps away, and no nearer.
  await page.getByRole('button', { name: /^Change the house rules/ }).click();
  await expect(payout).toHaveCount(0);
  await page.getByRole('button', { name: 'Help me choose' }).click();
  await expect(payout).toBeVisible();
});

test('names start empty, and the last group is offered rather than assumed', async ({
  page,
}) => {
  // Play one, so there is a last group to offer.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'New game' }).click();
  for (const [index, placeholder] of SEATS.entries()) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(NAMES[index]);
  }
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'New game' }).click();

  // Empty, not filled in behind your back.
  const east = page.getByPlaceholder(SEATS[0], { exact: true });
  await expect(east).toHaveValue('');

  await page
    .getByRole('button', { name: `Use last group: ${NAMES.join(', ')}` })
    .click();
  await expect(east).toHaveValue(NAMES[0]);
});
