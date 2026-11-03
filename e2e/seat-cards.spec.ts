import { expect, test, type Page } from '@playwright/test';

/**
 * P0-1: the seat card has to be read at a glance, from about a metre.
 *
 * Ten characters is the bar for a name, because the group's real names are
 * longer than "Player A" and half a name read across a table is worse than a
 * name on two lines.
 */

const NAMES = ['Alexandria', 'Montgomery', 'Wellington', 'Fitzgerald'];
const SEATS = ['East, deals first', 'South', 'West', 'North'];

async function startWithLongNames(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /I know what I'm doing/ }).click();
  for (const [index, placeholder] of SEATS.entries()) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(NAMES[index]);
  }
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForURL(/\?game=/);
}

test('four ten character names show in full at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithLongNames(page);

  for (const name of NAMES) {
    const label = page.getByText(name, { exact: true }).first();
    await expect(label).toBeVisible();
    // Not clipped: the element is as wide as the text inside it.
    const clipped = await label.evaluate(
      (el) => el.scrollWidth > el.clientWidth + 1,
    );
    expect(clipped, `${name} is truncated`).toBe(false);
  }
});

test('the total is the hero, and grows on a bigger screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithLongNames(page);

  const total = page.getByText('0', { exact: true }).first();
  const phone = await total.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  expect(phone).toBeGreaterThanOrEqual(34);

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(300);
  const tablet = await total.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  expect(tablet).toBeGreaterThanOrEqual(40);
});

test('nothing on a seat card is set below 12px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithLongNames(page);

  const tooSmall = await page.evaluate((names: string[]) => {
    const cards = [...document.querySelectorAll('.tile')].filter((card) =>
      names.some((name) => card.textContent?.includes(name)),
    );
    const small: string[] = [];
    for (const card of cards) {
      for (const el of card.querySelectorAll<HTMLElement>('*')) {
        const text = el.textContent?.trim();
        if (!text || el.children.length > 0) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 12) small.push(`${text.slice(0, 20)} at ${size}px`);
      }
    }
    return small;
  }, NAMES);
  expect(tooSmall).toEqual([]);
});

test('the change pill is there only when the last hand moved you', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithLongNames(page);

  // Before any hand, nobody has moved, so no card carries a change.
  await expect(page.getByText(/^Last hand /)).toHaveCount(0);

  await page.getByRole('button', { name: new RegExp(`won by ${NAMES[0]}`) }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Zi Mo/ }).click();
  await page
    .getByRole('dialog')
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'How many faan?' }) })
    .getByRole('button', { name: '4' })
    .click();
  await page.getByRole('button', { name: 'Save hand 1' }).click();

  // Now all four moved: one up, three down.
  await expect(page.getByText(/^Last hand /)).toHaveCount(4);
  await expect(page.getByText(/^Last hand \+/)).toHaveCount(1);
  await expect(page.getByText(/^Last hand -/)).toHaveCount(3);
});
