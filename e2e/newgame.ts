import type { Page } from '@playwright/test';

/**
 * Starting a game through the UI.
 *
 * Nothing is prefilled for a table that has not played here — the seeded
 * sample game is not theirs to inherit — so a spec that wants a game has to
 * name the four players itself, and say which rules it is doing arithmetic
 * under rather than relying on whatever the default happens to be.
 */

export const TABLE = ['Player A', 'Player B', 'Player C', 'Player D'];

const SEATS = ['East, deals first', 'South', 'West', 'North'];

/**
 * Open the new game sheet from home and name the four seats.
 *
 * Home asks which kind of table this is; a spec that is here to play takes
 * the door that goes straight to the players. The names start empty either
 * way, so it types its own four.
 */
export async function openNewGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /I know what I'm doing/ }).click();
  for (const [seat, placeholder] of SEATS.entries()) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(TABLE[seat]);
  }
}

/** Pick one of the built in rule sets, through the rules sheet. */
export async function chooseRuleSet(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: /^Change the house rules/ }).click();
  await page
    .getByRole('button', { name: new RegExp(`^${name}`) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Apply rules' }).click();
}
