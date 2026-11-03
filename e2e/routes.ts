import type { Page } from '@playwright/test';

/** The three sizes the review asks for. */
export const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

/** The seeded reference game, which every fresh browser profile starts with. */
const GAME = 'seed-aug-19-2026';

export interface Route {
  /** File name stem, also the heading in the contact sheet. */
  name: string;
  /** Get the page into the state worth photographing. */
  go: (page: Page) => Promise<void>;
}

async function settle(page: Page) {
  // The app seeds itself on first load, so wait for real content, not just DOM.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

export const ROUTES: Route[] = [
  {
    name: 'home',
    go: async (page) => {
      await page.goto('/');
      await settle(page);
    },
  },
  {
    name: 'sign-in-sheet',
    go: async (page) => {
      await page.goto('/');
      await settle(page);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'settings-sheet',
    go: async (page) => {
      await page.goto('/');
      await settle(page);
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    // The games list, which is the History screen now. The name is kept so
    // the before and after shots of this route still line up for review.
    name: 'games',
    go: async (page) => {
      await page.goto('/?view=games');
      await settle(page);
    },
  },
  {
    name: 'game-table',
    go: async (page) => {
      await page.goto(`/?game=${GAME}`);
      await settle(page);
    },
  },
  {
    name: 'record-hand-sheet',
    go: async (page) => {
      await page.goto(`/?game=${GAME}`);
      await settle(page);
      // Tapping a seat is how a hand starts.
      await page
        .getByRole('button', { name: /^Player [A-D], / })
        .first()
        .click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'record-hand-shooter',
    go: async (page) => {
      await page.goto(`/?game=${GAME}`);
      await settle(page);
      await page
        .getByRole('button', { name: /^Player [A-D], / })
        .first()
        .click();
      await page.waitForTimeout(400);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Cheut Chung/ })
        .click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'record-hand-faan',
    go: async (page) => {
      await page.goto(`/?game=${GAME}`);
      await settle(page);
      await page
        .getByRole('button', { name: /^Player [A-D], / })
        .first()
        .click();
      await page.waitForTimeout(400);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Zi Mo/ })
        .click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'hand-scorer',
    go: async (page) => {
      await page.goto(`/?game=${GAME}`);
      await settle(page);
      await page
        .getByRole('button', { name: /^Player [A-D], / })
        .first()
        .click();
      await page.waitForTimeout(400);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Zi Mo/ })
        .click();
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: 'Build a hand' }).click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'stats',
    go: async (page) => {
      await page.goto(`/?view=stats&game=${GAME}`);
      await settle(page);
    },
  },
  {
    name: 'settle',
    go: async (page) => {
      await page.goto('/?view=settle');
      await settle(page);
    },
  },
  {
    // A screen now rather than a sheet. The name is kept so the before and
    // after shots of it still line up for review.
    name: 'about-sheet',
    go: async (page) => {
      await page.goto('/?view=about');
      await settle(page);
    },
  },
  {
    name: 'score-hand',
    go: async (page) => {
      await page.goto('/?view=score');
      await settle(page);
    },
  },
  {
    name: 'score-hand-full',
    go: async (page) => {
      await page.goto('/?view=score');
      await settle(page);
      // Enough tiles to show the hand taking shape.
      const tiles = page.getByRole('button', { name: /^Add / });
      const count = Math.min(await tiles.count(), 8);
      for (let index = 0; index < count; index += 1) {
        await tiles.nth(index).click();
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'glossary',
    go: async (page) => {
      await page.goto('/?view=glossary');
      await settle(page);
    },
  },
  {
    name: 'glossary-pattern',
    go: async (page) => {
      await page.goto('/?view=glossary');
      await settle(page);
      await page
        .getByRole('button', { name: /Ping Wu/ })
        .first()
        .click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'game-settings',
    go: async (page) => {
      await page.goto('/?view=games');
      await settle(page);
      await page.getByRole('button', { name: /^Edit / }).first().click();
      await page.waitForTimeout(500);
    },
  },
];
