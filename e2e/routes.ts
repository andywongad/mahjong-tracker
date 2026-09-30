import type { Page } from '@playwright/test';

/** The three sizes the review asks for. */
export const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 800 },
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
        .getByRole('button', { name: /Record hand \d+ won by/ })
        .first()
        .click();
      await page.waitForTimeout(500);
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
    name: 'about-sheet',
    go: async (page) => {
      await page.goto('/?view=games');
      await settle(page);
      await page.getByRole('button', { name: 'How this works' }).click();
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
      await page.getByRole('button', { name: 'Settings' }).first().click();
      await page.waitForTimeout(500);
    },
  },
];
