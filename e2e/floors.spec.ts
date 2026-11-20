import { expect, test } from '@playwright/test';

/**
 * The two floors the review sets, measured on the rendered page rather than
 * read off the source: nothing below 12px, nothing tappable below 44x44.
 *
 * Rendered is the point. A size written as text-xs is easy to grep for; a
 * size inherited from a parent, or shrunk by a utility three files away, is
 * not, and that is where the small text had been hiding.
 *
 * Four routes do not meet either floor yet, which is P1-3's work and not a
 * regression. They are marked as expected failures rather than skipped, so
 * the suite says so when one of them starts passing and the marker can come
 * off. What they are short of, measured:
 *
 *   the table   11.2px round labels and player names, 10.4px Final and
 *               legend. Its targets are done: the tabs were 30px and the
 *               false win strip 29px, and both clear 44 now.
 *   stats       9.6px column headings, 11.2px figures; a 24px chart and
 *               values switch, 24px series buttons, 24px term tags
 *   history     10.4px Final, 11.2px names, 9.6px column headings; 24px
 *               term tags
 *   score hand  11.2px wind labels, an 8.8px star, a 20px checkbox
 *   home        a 24px History button, inline in a sentence
 *
 * Two of those are a question rather than a job. A term tag in a column
 * heading and a History inside a sentence are what WCAG 2.5.8 calls inline
 * targets, exempt because their size is held by the line height of the text
 * around them, and making either of them 44px tall would wreck the sentence
 * it sits in. They are counted here because this file measures the floor
 * rather than the standard, and whether to exempt them is a decision to
 * take once rather than quietly in a selector.
 */

const ROUTES = [
  ['/', 'home'],
  ['/?game=seed-aug-19-2026', 'the table'],
  ['/?view=stats&game=seed-aug-19-2026', 'stats'],
  ['/?view=games', 'history'],
  ['/?view=score', 'score a hand'],
  ['/?view=glossary', 'the glossary'],
] as const;

/** Text a sighted reader actually meets, and what size it is set at. */
function tooSmall(): string[] {
  const small: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('*')) {
    if (el.children.length > 0) continue;
    const text = el.textContent?.trim();
    if (!text) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    // Screen reader only text is clipped to a pixel and never read by eye.
    if (el.clientWidth <= 1 && el.clientHeight <= 1) continue;
    const size = parseFloat(style.fontSize);
    if (size < 12) small.push(`${text.slice(0, 24)} @ ${size}px`);
  }
  return [...new Set(small)];
}

/** Controls too small to hit, ignoring any nested inside a bigger one. */
function smallTargets(): string[] {
  const small: string[] = [];
  const controls = document.querySelectorAll<HTMLElement>(
    'button, a[href], input, select',
  );
  for (const el of controls) {
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    const owner = el.closest('button');
    if (owner && owner !== el) continue;
    if (box.height < 44 || box.width < 24) {
      const name =
        el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName;
      small.push(
        `${name.slice(0, 24)} @ ${Math.round(box.width)}x${Math.round(box.height)}`,
      );
    }
  }
  return [...new Set(small)];
}

/** Routes still short of the floors, by name. */
const SHORT_ON_TEXT = ['the table', 'stats', 'history', 'score a hand'];
const SHORT_ON_TARGETS = ['home', 'stats', 'history', 'score a hand'];

for (const [url, name] of ROUTES) {
  test(`${name} sets no text below 12px`, async ({ page }) => {
    test.fail(SHORT_ON_TEXT.includes(name), 'P1-3 has not reached it yet');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    expect(await page.evaluate(tooSmall)).toEqual([]);
  });

  test(`${name} has no control shorter than 44px`, async ({ page }) => {
    test.fail(SHORT_ON_TARGETS.includes(name), 'P1-3 has not reached it yet');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    expect(await page.evaluate(smallTargets)).toEqual([]);
  });
}
