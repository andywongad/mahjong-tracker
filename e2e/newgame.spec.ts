import { expect, test } from '@playwright/test';

/**
 * The two doors into a new game, and what is behind each.
 *
 * Home asks which kind of table this is before the sheet opens, so starting
 * a game is still one tap either way. The sheet itself is the same both
 * times: the guide is what differs, not the form.
 */

const SEATS = ['East, deals first', 'South', 'West', 'North'];
const NAMES = ['Aaron', 'Jad', 'Dave', 'Jacky'];
const knowing = /I know what I'm doing/;
const learning = /I'm still learning/;

test('home offers both, and neither is the default', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Start a game' })).toBeVisible();
  await expect(page.getByRole('button', { name: learning })).toBeVisible();
  await expect(page.getByRole('button', { name: knowing })).toBeVisible();
});

test('the knowing door goes straight to the players', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: knowing }).click();

  // No payout question on the way, and the rules already answered.
  await expect(
    page.getByRole('heading', { name: 'On a discard win, who pays?' }),
  ).toHaveCount(0);
  await expect(page.getByText('Hong Kong standard')).toBeVisible();
  await expect(page.getByText('(recommended)')).toBeVisible();

  for (const [index, placeholder] of SEATS.entries()) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(NAMES[index]);
  }
  await page.getByRole('button', { name: 'Start game' }).click();

  await page.waitForURL(/\?game=/);
  await expect(page.getByRole('button', { name: /^Aaron, / })).toBeVisible();
});

test('the learning door opens on the questions, and lands on the form', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: learning }).click();

  await expect(
    page.getByRole('heading', { name: 'On a discard win, who pays?' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Skip the rest and keep the usual' })
    .click();
  await page.getByRole('button', { name: 'Use these rules' }).click();

  await expect(
    page.getByPlaceholder(SEATS[0], { exact: true }),
  ).toBeVisible();
});

test('closing the questions from that door gets out altogether', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: learning }).click();

  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  // Not dropped on a form nobody asked for.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Start a game' })).toBeVisible();
});

test('names start empty, and the last group is offered rather than assumed', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: knowing }).click();
  for (const [index, placeholder] of SEATS.entries()) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(NAMES[index]);
  }
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: knowing }).click();

  const east = page.getByPlaceholder(SEATS[0], { exact: true });
  await expect(east).toHaveValue('');

  await page
    .getByRole('button', { name: `Use last group: ${NAMES.join(', ')}` })
    .click();
  await expect(east).toHaveValue(NAMES[0]);
});
