/*
 * Build public/tiles.svg from the drawn tile bundle.
 *
 * The bundle is forty square artboards with generic file names, so the mapping
 * from file to tile lives here and nowhere else. Run it again if the bundle
 * changes:
 *
 *   node scripts/build-tile-sprite.mjs
 *
 * Coordinates are rounded to whole units. The artboards are 1254 wide and a
 * tile is drawn at about 40px, so a unit is already a thirtieth of a pixel and
 * the decimals in the export cost about a third of the file for nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

/* The source artboards, kept out of public so only the sprite ships. */
const DIR = 'design-reference/mahjong-svg-bundle';

/** Which artboard is which tile. Numbers 35 and 36 are decorative dragons. */
const TILES = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => [`d${n}`, i + 1]),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => [`b${n}`, i + 10]),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => [`c${n}`, i + 19]),
  ['wE', 28],
  ['wS', 29],
  ['wW', 30],
  ['wN', 31],
  ['rG', 32],
  ['rW', 33],
  ['rR', 34],
  ['s1', 37],
  ['s2', 38],
  ['s3', 39],
  ['s4', 40],
];

/** The union of every artboard's drawing, so no tile is clipped or jumps. */
const VIEW_BOX = '177 22 900 1211';

const symbols = TILES.map(([key, index]) => {
  const source = readFileSync(`${DIR}/svg   (${index}).svg`, 'utf8');
  const body = source
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))))
    .replace(/\s+/g, ' ')
    .trim();
  return `<symbol id="t-${key}" viewBox="${VIEW_BOX}">${body}</symbol>`;
});

const sprite =
  `<svg xmlns="http://www.w3.org/2000/svg">` + symbols.join('') + `</svg>`;

writeFileSync('public/tiles.svg', sprite);
console.log(
  `public/tiles.svg: ${TILES.length} tiles, ` +
    `${(sprite.length / 1024).toFixed(0)}KB raw, ` +
    `${(gzipSync(sprite, { level: 9 }).length / 1024).toFixed(0)}KB gzipped`,
);
