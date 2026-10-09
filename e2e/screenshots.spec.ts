import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { ROUTES, SIZES } from './routes';

/**
 * Capture the design review set.
 *
 * Which set is written is chosen by SHOT_PHASE (before or after), and
 * SHOT_ROUTES can narrow it to the routes a phase actually touched, so a later
 * phase does not rewrite screenshots it had no effect on.
 *
 *   SHOT_PHASE=before npx playwright test e2e/screenshots.spec.ts
 *   SHOT_PHASE=after SHOT_ROUTES=game-table,record-hand-sheet npx playwright test e2e/screenshots.spec.ts
 */
// No default. A bare `playwright test` once overwrote the whole before set,
// which cannot be re-taken without checking the old code out again, so this
// capture now only runs when a phase is named.
const phase = process.env.SHOT_PHASE;
const only = process.env.SHOT_ROUTES?.split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const routes = only?.length
  ? ROUTES.filter((route) => only.includes(route.name))
  : ROUTES;

if (phase && phase !== 'before' && phase !== 'after') {
  throw new Error(`SHOT_PHASE must be before or after, got ${phase}`);
}

const outDir = `design-review/${phase}`;
if (phase) mkdirSync(outDir, { recursive: true });

for (const route of routes) {
  for (const size of SIZES) {
    test(`${phase ?? 'shots'}: ${route.name} at ${size.name}`, async ({
      page,
    }) => {
      test.skip(
        !phase,
        'Set SHOT_PHASE=before or after to capture screenshots.',
      );
      await page.setViewportSize({ width: size.width, height: size.height });
      await route.go(page);
      await page.screenshot({
        path: `${outDir}/${route.name}--${size.name}.png`,
        // Full page, because how far a screen runs on is itself a finding.
        fullPage: true,
      });
    });
  }
}
