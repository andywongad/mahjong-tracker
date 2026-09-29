import { defineConfig } from '@playwright/test';

/**
 * Playwright is here for two jobs: the design review screenshots, and the end
 * to end checks that a hand can actually be recorded.
 *
 * It runs against the dev server already running on 3000, and reuses it rather
 * than starting its own, so a capture never waits on a cold build.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    // Screenshots must not differ run to run because of an animation.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
