import { expect, test } from '@playwright/test';

/**
 * Changing the house rules part way through a game.
 *
 * The seeded game is the Aug 19 2026 fixture, played under the group's own
 * rules. Switching it to Hong Kong standard is the real question this answers:
 * nothing recorded is lost, because only faan is stored, so every score is
 * worked out again from the same nineteen hands.
 */

const GAME = '/?game=seed-aug-19-2026';

/** The rules live in the game's own menu now, not beside Settings. */
async function openRules(page: import('@playwright/test').Page) {
  await page.locator('header').getByRole('button', { name: 'This game' }).click();
  await page.getByRole('button', { name: /House rules/ }).click();
}

/** A seat's running total, which is always signed. */
function seatScore(page: import('@playwright/test').Page, name: string) {
  return page.locator(`[aria-label^="${name}, "] .tnum`).first();
}

test('the rules can be changed from the table, and say what that costs first', async ({
  page,
}) => {
  await page.goto(GAME);
  await page.waitForLoadState('networkidle');
  await expect(seatScore(page, 'Player C')).toHaveText('+64');

  await openRules(page);
  await page.getByRole('button', { name: /Hong Kong standard/ }).click();

  // A change part way through never happens without saying what it does.
  await page.getByRole('button', { name: 'Apply rules' }).click();
  await expect(page.getByText(/recalculate all 19 hands/i)).toBeVisible();
  await expect(
    page.getByText(/faan you recorded stays as it is/i),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Recalculate 19 hands' }).click();

  // Same hands, same faan, different rules: the scores are worked out again.
  await expect(seatScore(page, 'Player C')).toHaveText('+104');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a rules change holds after a reload, and only touches this game', async ({
  page,
}) => {
  await page.goto(GAME);
  await page.waitForLoadState('networkidle');

  await openRules(page);
  await page.getByRole('button', { name: /Hong Kong standard/ }).click();
  await page.getByRole('button', { name: 'Apply rules' }).click();
  await page.getByRole('button', { name: 'Recalculate 19 hands' }).click();
  await expect(seatScore(page, 'Player C')).toHaveText('+104');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(seatScore(page, 'Player C')).toHaveText('+104');

  // A new game starts from the rules of the last one played, not from the
  // rules a saved set happens to hold.
  await page.goto('/');
  await page.getByRole('button', { name: /I know what I'm doing/ }).click();
  await expect(page.getByText(/Hong Kong standard/)).toBeVisible();
});

test('a table can settle a discard between two people only', async ({
  page,
}) => {
  await page.goto(GAME);
  await page.waitForLoadState('networkidle');
  await expect(seatScore(page, 'Player C')).toHaveText('+64');

  await openRules(page);
  const sheet = page.getByRole('dialog');
  await sheet.getByText('Only the shooter pays, at face value').click();

  await sheet.getByRole('button', { name: 'Apply rules' }).click();
  await page.getByRole('button', { name: 'Recalculate 19 hands' }).click();

  // Same nineteen hands, same faan, settled between two people instead of
  // four: every discard win in the game is now one payment.
  await expect(seatScore(page, 'Player C')).toHaveText('+59');
  await expect(seatScore(page, 'Player A')).toHaveText('-12');
  await expect(seatScore(page, 'Player B')).toHaveText('-32');
  await expect(seatScore(page, 'Player D')).toHaveText('-15');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a table can take the doubling off a self drawn win', async ({
  page,
}) => {
  await page.goto(GAME);
  await page.waitForLoadState('networkidle');
  await expect(seatScore(page, 'Player C')).toHaveText('+64');

  await openRules(page);
  const sheet = page.getByRole('dialog');

  // The other half of the question beside it: a self draw has nobody to
  // blame, so the only thing to settle is what each of the three pays.
  await expect(
    sheet.getByRole('button', { name: /^Double, two each/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: /^Face value, one each/ }).click();

  await sheet.getByRole('button', { name: 'Apply rules' }).click();
  await page.getByRole('button', { name: 'Recalculate 19 hands' }).click();

  // Eight of the nineteen hands were self drawn. Each now pays the hand
  // once instead of twice, and nothing else about the game moves.
  await expect(seatScore(page, 'Player C')).toHaveText('+33');
  await expect(seatScore(page, 'Player A')).toHaveText('-18');
  await expect(seatScore(page, 'Player B')).toHaveText('-26');
  await expect(seatScore(page, 'Player D')).toHaveText('+11');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
