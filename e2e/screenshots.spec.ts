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
const phase = process.env.SHOT_PHASE ?? 'before';
const only = process.env.SHOT_ROUTES?.split(',').map((name) => name.trim()).filter(Boolean);
const routes = only?.length ? ROUTES.filter((route) => only.includes(route.name)) : ROUTES;

const outDir = `design-review/${phase}`;
mkdirSync(outDir, { recursive: true });

for (const route of routes) {
  for (const size of SIZES) {
    test(`${phase}: ${route.name} at ${size.name}`, async ({ page }) => {
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
