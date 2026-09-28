'use client';

import { useEffect } from 'react';

/**
 * Register the service worker so the app opens with no signal at the table.
 *
 * Production only. Build assets are content hashed in a production build, which
 * is what makes the cache first strategy safe; in development the same URLs are
 * reused as code changes, so a registered worker would serve stale chunks and
 * edits would appear not to land. Any worker left over from a previous
 * development session is removed.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith('shell-') || key.startsWith('assets-'))
              .map((key) => caches.delete(key)),
          );
        }
      })();
      return;
    }

    // Registering after load keeps it clear of the first paint.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // An unavailable service worker is not worth interrupting the game for.
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
