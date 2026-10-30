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
 * The four flowers, which the bundle does not draw.
 *
 * Hong Kong mahjong has eight bonus tiles, the flowers and the seasons, and a
 * player sitting East can hold both number ones and score a faan for each.
 *
 * The plant on each of the bundle's season tiles is in fact its flower: the
 * first is a plum blossom, which is 梅. So a flower tile is that same drawing
 * with the season character lifted off and the flower's own written in its
 * place, which makes it, if anything, the more correct of the two.
 *
 * Drop four drawn flowers in and add them to TILES above to replace these.
 */
const FLOWERS = [
  ['f1', '梅', 37],
  ['f2', '蘭', 38],
  ['f3', '菊', 39],
  ['f4', '竹', 40],
];

/** Where the season character sits on every one of these artboards. */
const CHARACTER_BOX = { minX: 640, maxMidY: 470 };

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

/** Whole units: the artboards are 1254 wide and a tile draws at about 40px. */
function round(text) {
  return text.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));
}

/** One layer of an artboard, by the colour its path is named for. */
function layer(index, id) {
  const source = readFileSync(`${DIR}/svg   (${index}).svg`, 'utf8');
  const match = source.match(new RegExp(`<path id="${id}"[^>]*?/>`));
  if (!match) throw new Error(`No ${id} layer in artboard ${index}`);
  return round(match[0]);
}

/**
 * The red layer of an artboard, split into the written character and the rest.
 *
 * The export puts both in one path, but as separate subpaths, and the
 * character is the only thing in the top right corner. Each subpath's first
 * move names where it starts, which is enough to tell them apart without
 * measuring the curves.
 */
function splitRedLayer(index) {
  const source = readFileSync(`${DIR}/svg   (${index}).svg`, 'utf8');
  const d = source.match(/<path id="red"[^>]*?\bd="([^"]*)"/)[1];
  const character = [];
  const art = [];

  for (const sub of d.split(/(?=M )/)) {
    const piece = sub.trim();
    if (!piece) continue;
    const [x, y] = piece.slice(1).trim().split(/[ ,]+/).map(Number);
    const written = x > CHARACTER_BOX.minX && y < CHARACTER_BOX.maxMidY;
    (written ? character : art).push(piece);
  }

  if (character.length === 0) throw new Error(`No character found on ${index}`);
  if (art.length === 0) throw new Error(`No art left on ${index}`);
  return { character: character.join(' '), art: art.join(' ') };
}

const flowers = FLOWERS.map(([key, character, index]) => {
  const source = readFileSync(`${DIR}/svg   (${index}).svg`, 'utf8');
  const red = splitRedLayer(index);
  const redFill = source.match(/<path id="red" fill="([^"]*)"/)[1];

  const body =
    layer(index, 'black') +
    layer(index, 'green') +
    layer(index, 'navy') +
    `<path fill="${redFill}" fill-rule="evenodd" d="${round(red.art)}"/>` +
    // The flower's own name, where the season's used to be. Ochre rather than
    // the seasons' red, so a glance tells the two groups apart.
    `<text x="862" y="420" text-anchor="middle" font-size="310" ` +
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
