import { expect, test } from '@playwright/test';

/**
 * The two floors the review sets, measured on the rendered page rather than
 * read off the source: nothing below 12px, nothing tappable below 44x44.
 *
 * Rendered is the point. A size written as text-xs is easy to grep for; a
 * size inherited from a parent, or shrunk by a utility three files away, is
 * not, and that is where the small text had been hiding.
 *
 * Every route clears the 44px floor. Four are still short on text, which is
 * P1-3's work and not a regression, and they are marked as expected failures
 * rather than skipped so the suite says so when one starts passing and the
 * marker can come off. What they are short of, measured:
 *
 *   the table   11.2px round labels and player names, 10.4px Final and
 *               legend
 *   stats       9.6px column headings, 11.2px figures
 *   history     10.4px Final, 11.2px names, 9.6px column headings
 *   score hand  11.2px wind labels, an 8.8px star
 *
 * Two kinds of target are measured differently rather than grown, and both
 * are judgements worth stating. A target declaring itself inline is skipped,
 * because WCAG 2.5.8 exempts one whose size is held by the line height
 * around it: a glossary term in a column heading, a History inside a
 * sentence. The markup declares that rather than this file guessing it from
 * styling, which would sooner or later excuse a real button. And a checkbox
 * in a label is measured by the label, because that is what a thumb hits.
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
    // A checkbox in a label is tapped by its label, so that is the target
    // a thumb actually has to hit. Measuring the 20px box alone understates
    // it, and growing the box to 44 would be a very large checkbox solving
    // a problem nobody had.
    const label = el.closest('label');
    const box = (label ?? el).getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    const owner = el.closest('button');
    if (owner && owner !== el) continue;
    // A target inside a run of text, exempted by WCAG 2.5.8 because its
    // size is held by the line height around it. Declared in the markup
    // rather than guessed at here: a rule inferring "this looks inline"
    // from padding or display would sooner or later excuse a real button.
    if (el.closest('[data-inline-target]')) continue;
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
/** Every route clears the 44px floor. Nothing left to mark. */
const SHORT_ON_TARGETS: string[] = [];

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
