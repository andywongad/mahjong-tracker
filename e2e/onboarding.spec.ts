import { expect, test } from '@playwright/test';
import { openNewGame } from './newgame';

/**
 * The way into the rules walkthrough.
 *
 * One entry, with the house rules it is about: tap Start a game, and the
 * offer is under the rules row, above Start game. Not on home, and not only
 * on a table's first night — a group picks up new players long after that.
 */

const offer = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Help me pick the rules' });

test('home asks which kind of table this is, under its own heading', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Both doors are on home, so starting a game is still one tap.
  await expect(
    page.getByRole('heading', { name: 'Start a game' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /I'm still learning/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /I know what I'm doing/ }),
  ).toBeVisible();

  // Still learning goes straight into the questions, no sheet in between.
  await page.getByRole('button', { name: /I'm still learning/ }).click();
  await expect(
    page.getByRole('heading', { name: 'On a discard win, who pays?' }),
  ).toBeVisible();

  // And finishing them lands on the form, the fork not asked again.
  await page
    .getByRole('button', { name: 'Skip the rest and keep the usual' })
    .click();
  await page.getByRole('button', { name: 'Use these rules' }).click();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
});

test('knowing what you are doing goes straight to the players', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /I know what I'm doing/ }).click();

  await expect(
    page.getByPlaceholder('East, deals first', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
});

test('starting another game from history goes straight to the players', async ({
  page,
}) => {
  // The question belongs on home. Somebody reading their own history has
  // played before, and the walkthrough is still a tap away under the rules.
  await page.goto('/?view=games');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Start another game' }).click();

  await expect(
    page.getByPlaceholder('East, deals first', { exact: true }),
  ).toBeVisible();
  await expect(offer(page)).toBeVisible();
});

test('the offer sits with the house rules, on a first game and after one', async ({
  page,
}) => {
  await openNewGame(page);
  await expect(offer(page)).toBeVisible();

  // Play one, and it is still there for the next.
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);

  await openNewGame(page);
  await expect(offer(page)).toBeVisible();
});

test('it is not on home, where there are no rules to pick yet', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#main')).toBeVisible();
  await expect(offer(page)).toHaveCount(0);
});

test('taking it leads through the questions and back to the new game', async ({
  page,
}) => {
  await openNewGame(page);
  await offer(page).click();

  await expect(
    page.getByRole('heading', { name: 'On a discard win, who pays?' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Skip the rest and keep the usual' })
    .click();
  await page.getByRole('button', { name: 'Use these rules' }).click();

  // Back on the sheet, with the players still named and ready to start.
  // Scoped to the dialog: home carries a heading of the same name.
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Start a game' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled();
});

test('a first game inherits nothing from the seeded sample', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /I know what I'm doing/ }).click();

  // Empty seats rather than the sample table's four players.
  await expect(
    page.getByPlaceholder('East, deals first', { exact: true }),
  ).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Start game' })).toBeDisabled();
  // And the app's own default, not the sample's house rules.
  await expect(
    page.getByRole('button', { name: /^House rules: Hong Kong standard/ }),
  ).toBeVisible();
});

test('a named set goes on the game and into the list for the next one', async ({
  page,
}) => {
  await openNewGame(page);
  await offer(page).click();

  // An answer no preset covers, so it is the table's own and asks to be named.
  await page
    .getByRole('button', { name: /Only the shooter pays, at face value/ })
    .click();
  await page
    .getByRole('button', { name: 'Skip the rest and keep the usual' })
    .click();
  await page.getByLabel('Give these rules a name').fill('Friday night');
  await page.getByRole('button', { name: 'Use these rules' }).click();

  // The game is labelled with it.
  await expect(
    page.getByRole('button', { name: /^House rules: Friday night/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);

  // And the next game can pick it without answering anything again.
  await openNewGame(page);
  await page.getByRole('button', { name: /^House rules:/ }).click();
  await expect(
    page.getByRole('button', { name: /^Friday night/ }),
  ).toBeVisible();
});
