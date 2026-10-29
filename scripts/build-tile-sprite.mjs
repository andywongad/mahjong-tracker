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

/**
 * The four flowers, which the bundle does not have.
 *
 * Hong Kong mahjong has eight bonus tiles, the flowers and the seasons, and a
 * player sitting East can hold both number ones and score a faan for each. The
 * bundle only draws the seasons, so these are composed from the set's own
 * frame and corner number with the character written on: plainer than the
 * drawn seasons, unmistakable all the same.
 *
 * Drop four more artboards in and add them to TILES above to replace these.
 */
const FLOWERS = [
  ['f1', '梅', 37],
  ['f2', '蘭', 38],
  ['f3', '菊', 39],
  ['f4', '竹', 40],
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

/** One layer of an artboard, by the colour its path is named for. */
function layer(index, id) {
  const source = readFileSync(`${DIR}/svg   (${index}).svg`, 'utf8');
  const match = source.match(new RegExp(`<path id="${id}"[^>]*?/>`));
  if (!match) throw new Error(`No ${id} layer in artboard ${index}`);
  return match[0].replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));
}

const flowers = FLOWERS.map(([key, character, index]) => {
  // The frame is the same on every artboard; the number comes from the season
  // that shares this flower's number.
  const body =
    layer(37, 'black') +
    layer(index, 'navy') +
    `<text x="627" y="790" text-anchor="middle" font-size="430" ` +
    `class="hanzi" fill="#a86e12">${character}</text>`;
  return `<symbol id="t-${key}" viewBox="${VIEW_BOX}">${body}</symbol>`;
});

const sprite =
  `<svg xmlns="http://www.w3.org/2000/svg">` +
  symbols.concat(flowers).join('') +
  `</svg>`;

writeFileSync('public/tiles.svg', sprite);
console.log(
  `public/tiles.svg: ${TILES.length + FLOWERS.length} tiles, ` +
    `${(sprite.length / 1024).toFixed(0)}KB raw, ` +
    `${(gzipSync(sprite, { level: 9 }).length / 1024).toFixed(0)}KB gzipped`,
);
