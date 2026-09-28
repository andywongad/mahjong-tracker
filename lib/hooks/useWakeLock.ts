'use client';

import { useEffect } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

/**
 * Hold a screen wake lock while a game is on the table, so the phone does not
 * dim between hands. Falls back silently where the API is missing or the
 * request is refused, which is the case on most iOS versions.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const next = await wakeLock!.request('screen');
        if (cancelled) {
          await next.release();
          return;
        }
        sentinel = next;
      } catch {
        // A refused lock is not worth surfacing; the screen just dims as usual.
      }
    }

    // The lock drops when the tab is hidden, so take it again on return.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
