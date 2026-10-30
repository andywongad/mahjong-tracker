import { expect, test } from '@playwright/test';

/**
 * The hints that say what a button does.
 *
 * What matters is that they reach a keyboard as well as a pointer, that they
 * can be got rid of, and that a phone never sees them: there is no hover on a
 * touch screen, and a hint that flashed on the way to a tap would be in the
 * way rather than of help.
 */

const tooltip = (page: import('@playwright/test').Page) =>
  page.locator('[role="tooltip"]');

test('a hint appears under the pointer and says what the button does', async ({
  page,
}) => {
  await page.goto('/?game=seed-aug-19-2026');
  await page.waitForLoadState('networkidle');

  await expect(tooltip(page)).toHaveCount(0);

  await page.locator('header').getByRole('button', { name: 'Rules' }).hover();
  await expect(tooltip(page)).toHaveText(/what it pays/i);

  // It describes the button rather than renaming it, so the name is still the
  // name a screen reader reads first.
  const rules = page.locator('header').getByRole('button', { name: 'Rules' });
  await expect(rules).toHaveAttribute('aria-describedby', /./);
});

test('the hint goes when the pointer does', async ({ page }) => {
  await page.goto('/?game=seed-aug-19-2026');
  await page.waitForLoadState('networkidle');

  await page.locator('header').getByRole('button', { name: 'Stats' }).hover();
  await expect(tooltip(page)).toHaveCount(1);

  await page.mouse.move(2, 2);
  await expect(tooltip(page)).toHaveCount(0);
});

test('a keyboard gets the hint too, and Escape dismisses it', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Tab until something with a hint has focus.
  for (let i = 0; i < 12 && (await tooltip(page).count()) === 0; i += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(tooltip(page)).toHaveCount(1);

  // WCAG 1.4.13 asks that content shown on focus can be dismissed.
  await page.keyboard.press('Escape');
  await expect(tooltip(page)).toHaveCount(0);
});

test('a touch screen never shows one', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  await page.goto('/?game=seed-aug-19-2026');
  await page.waitForLoadState('networkidle');

  // A finger arriving is not a pointer hovering; it is on its way to a press.
  await page
    .locator('header')
    .getByRole('button', { name: 'Rules' })
    .evaluate((el) => {
      el.parentElement?.dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'touch', bubbles: false }),
      );
    });
  await expect(tooltip(page)).toHaveCount(0);

  // And tapping it still does what it always did.
  await page.locator('header').getByRole('button', { name: 'Rules' }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(tooltip(page)).toHaveCount(0);
  await context.close();
});

test('a button that cannot be pressed still explains itself', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // A disabled button fires no pointer events of its own, so the hint has to
  // come from the box around it.
  await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Reference"]');
    const button = nav?.querySelector('button');
    if (button) button.setAttribute('disabled', '');
  });

  const history = page
    .getByRole('navigation', { name: 'Reference' })
    .getByRole('button', { name: 'History' });
  await history.hover({ force: true });
  await expect(tooltip(page)).toHaveCount(1);
});
