'use client';

/**
 * Which app-wide sheet is open.
 *
 * Settings and the house rules are reachable from the top of every screen
 * now, so neither can belong to the screen that happens to be showing. They
 * are rendered once, above the view, and opened through this.
 *
 * The same external-store shape as the theme: it is state that lives outside
 * React's tree, read through useSyncExternalStore rather than threaded down
 * as props through every screen that might want to open one.
 */
export type GlobalSheet = 'settings' | 'rules' | null;

let current: GlobalSheet = null;
const listeners = new Set<() => void>();

export function subscribeSheet(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export const openSheetSnapshot = (): GlobalSheet => current;

/** Nothing is open while rendering on the server. */
export const openSheetOnServer = (): GlobalSheet => null;

export function openSheet(sheet: GlobalSheet): void {
  current = sheet;
  for (const listener of listeners) listener();
}

export const closeSheet = () => openSheet(null);
