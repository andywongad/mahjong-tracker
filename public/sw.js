/*
 * Service worker for the mahjong tracker.
 *
 * The scorekeeper often has no signal at the table, so the app has to open and
 * work with the network down. Games themselves live in IndexedDB; this only has
 * to keep the shell and its assets available.
 *
 * Navigations are network first, so a deployed change is picked up promptly,
 * falling back to the cached shell when the network is gone. Assets are served
 * cache first: the ones Next builds carry a hash in their path, and the ones at
 * a fixed path — tiles.svg, the icons, the font — are held in a cache named for
 * VERSION below.
 *
 * VERSION is stamped by scripts/stamp-sw.mjs from the contents of those fixed
 * path files, and must not be edited by hand. Editing it by hand is what went
 * wrong before: the tile sprite was rebuilt three times while VERSION stayed at
 * v2, so returning browsers kept serving the first sprite out of shell-v2 and
 * never saw the new flowers.
 */

const VERSION = '43bec3c5e67e';
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = '/offline';

const SHELL_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/fonts/noto-serif-tc-subset.woff2',
  '/tiles.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // One bad URL should not fail the whole install.
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:png|svg|ico|woff2?|css|js)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(request)) ??
            (await cache.match('/')) ??
            (await cache.match(OFFLINE_URL)) ??
            new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          );
        }
      })(),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        // Anything precached at install lands in the shell cache, so both are
        // searched before the network. Without that, an asset listed in
        // SHELL_URLS is cached and still fetched every time.
        const assets = await caches.open(ASSET_CACHE);
        const cached =
          (await assets.match(request)) ?? (await caches.match(request));
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) assets.put(request, response.clone());
          return response;
        } catch {
          // Offline and never seen: say so rather than throwing, which would
          // surface as a network error with no explanation.
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      })(),
    );
  }
});
