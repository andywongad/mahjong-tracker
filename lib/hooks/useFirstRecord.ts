'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'mahjong-recorded-once';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function neverRecorded(): boolean {
  try {
    return localStorage.getItem(KEY) === null;
  } catch {
    // A blocked store means no nudge, which is the quieter failure.
    return false;
  }
}

/** Called once a hand has actually been saved, which retires the nudge. */
export function markRecorded(): void {
  if (!neverRecorded()) return;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    return;
  }
  for (const listener of listeners) listener();
}

/**
 * Whether this browser has never recorded a hand, so the seats can say quietly
 * that they are the way in. The server has no idea, so it renders as false and
 * the nudge appears after hydration.
 */
export function useFirstRecord(): boolean {
  return useSyncExternalStore(subscribe, neverRecorded, () => false);
}

/**
 * The one-line hint over the table, telling a newcomer that the seats are
 * the way in.
 *
 * Its own key, because it can be dismissed without recording anything, and
 * recording something should retire it whether it was dismissed or not.
 */
const HINT_KEY = 'mahjong-seat-hint-dismissed';

function hintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) !== null;
  } catch {
    // A blocked store means no hint, which is the quieter failure.
    return true;
  }
}

export function dismissSeatHint(): void {
  if (hintDismissed()) return;
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    return;
  }
  for (const listener of listeners) listener();
}

/** Whether the hint still has something to say on this device. */
export function useSeatHint(): boolean {
  const never = useSyncExternalStore(subscribe, neverRecorded, () => false);
  const dismissed = useSyncExternalStore(subscribe, hintDismissed, () => true);
  return never && !dismissed;
}
