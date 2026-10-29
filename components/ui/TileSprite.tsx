'use client';

import { useEffect } from 'react';

/** Where the drawings live, built by scripts/build-tile-sprite.mjs. */
const SPRITE_URL = '/tiles.svg';
const HOST_ID = 'tile-sprite';

/**
 * Puts the tile drawings into the page, once.
 *
 * Every tile is one <use> of a shape defined here, so the forty odd drawings
 * are fetched as a single file rather than as a request each. It has to be in
 * the document rather than referenced across files, because Safari has never
 * followed a <use> into another document.
 *
 * The service worker holds the file, so after the first visit this is a cache
 * read. Until it lands a tile shows as a blank face, which is what a tile
 * looks like from the back anyway.
 */
export function TileSprite() {
  useEffect(() => {
    if (document.getElementById(HOST_ID)) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(SPRITE_URL);
        if (!response.ok) return;
        const markup = await response.text();
        if (cancelled || document.getElementById(HOST_ID)) return;

        const host = document.createElement('div');
        host.id = HOST_ID;
        host.setAttribute('aria-hidden', 'true');
        host.style.display = 'none';
        host.innerHTML = markup;
        document.body.prepend(host);
      } catch {
        // No drawings is a worse app, not a broken one.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
