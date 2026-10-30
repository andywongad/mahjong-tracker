/*
 * Stamp the service worker's version from the files it precaches.
 *
 * The worker serves assets cache first under a cache named for VERSION. A file
 * it precaches by a fixed path — tiles.svg above all — therefore lives in that
 * cache until the cache name changes. Bumping VERSION by hand was forgotten the
 * first time it mattered: the tile sprite changed three times while VERSION sat
 * at v2, so every returning browser kept the first sprite and never saw the new
 * flowers.
 *
 * So the version is derived rather than remembered. Any precached file that
 * changes changes the hash, which changes the cache name, which makes the
 * browser install the worker again and drop the stale caches.
 *
 * Runs from prebuild, so a deploy cannot go out unstamped.
 *
 *   node scripts/stamp-sw.mjs           rewrites public/sw.js
 *   node scripts/stamp-sw.mjs --check   exits non-zero if it is stale
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';

const SW = new URL('../public/sw.js', import.meta.url);
const source = readFileSync(SW, 'utf8');

// Read the list out of the worker itself rather than restating it here, so the
// two cannot drift.
const block = source.match(/const SHELL_URLS = \[([\s\S]*?)\];/);
if (!block) throw new Error('Could not find SHELL_URLS in public/sw.js');

const urls = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

// '/' and '/offline' are rendered routes, not files on disk, and are fetched
// network first anyway, so only what actually sits in public/ is hashed.
const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};
const files = urls
  .map((url) => [url, new URL(`../public${url}`, import.meta.url)])
  .filter(([, path]) => isFile(path))
  .sort(([a], [b]) => (a < b ? -1 : 1));

if (files.length === 0) throw new Error('No precached files found to hash');

// The name goes in with the bytes, so moving a file counts as a change too.
const hash = createHash('sha256');
for (const [url, path] of files) {
  hash.update(url);
  hash.update(readFileSync(path));
}
const version = hash.digest('hex').slice(0, 12);

const stamped = source.replace(
  /const VERSION = '[^']*';/,
  `const VERSION = '${version}';`,
);
if (stamped === source && !source.includes(`const VERSION = '${version}'`))
  throw new Error('Could not find the VERSION line in public/sw.js');

const current = source.match(/const VERSION = '([^']*)';/)?.[1];

if (process.argv.includes('--check')) {
  if (current !== version) {
    console.error(
      `public/sw.js is stale: VERSION is ${current}, the shell hashes to ${version}.\n` +
        'Run: node scripts/stamp-sw.mjs',
    );
    process.exit(1);
  }
  console.log(`public/sw.js is current at ${version}`);
} else {
  if (current === version) {
    console.log(`public/sw.js already at ${version}`);
  } else {
    writeFileSync(SW, stamped);
    console.log(
      `public/sw.js: ${current} -> ${version} (${files.length} precached files)`,
    );
  }
}
