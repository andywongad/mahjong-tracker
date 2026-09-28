/*
 * WCAG contrast check over the real design tokens.
 *
 * This parses app/globals.css rather than restating the palette, so it can
 * never drift from what the app actually renders. An earlier version hardcoded
 * the values and happily passed while the stylesheet said something different.
 *
 *   node scripts/check-contrast.mjs        exits non-zero on any failure
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

/** Pull one token block out of the stylesheet. */
function tokensFrom(startMarker) {
  const start = css.indexOf(startMarker);
  if (start === -1) throw new Error(`Could not find block: ${startMarker}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = css.slice(open, end);
  const out = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[name] = value.trim();
  }
  return out;
}

const LIGHT = tokensFrom(':root {');
const DARK = tokensFrom(":root[data-theme='dark']");

const hexToRgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6); // ignore alpha for this check
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = hexToRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const WHITE = '#ffffff';
const NEED = { text: 4.5, large: 3, ui: 3 };

/** [label, foreground token, background token, kind] */
const PAIRS = [
  ['body ink on page', 'ink', 'page', 'text'],
  ['ink on tile face', 'ink', 'tile-face', 'text'],
  ['ink on surface', 'ink', 'surface', 'text'],
  ['muted on page', 'muted', 'page', 'text'],
  ['muted on tile face', 'muted', 'tile-face', 'text'],
  ['muted on surface', 'muted', 'surface', 'text'],
  ['ink on felt', 'ink-on-felt', 'felt', 'text'],
  ['muted on felt', 'muted-on-felt', 'felt', 'text'],
  ['gain on tile face', 'gain', 'tile-face', 'text'],
  ['loss on tile face', 'loss', 'tile-face', 'text'],
  ['gain on surface', 'gain', 'surface', 'text'],
  ['loss on surface', 'loss', 'surface', 'text'],
  ['gain on page', 'gain', 'page', 'text'],
  ['loss on page', 'loss', 'page', 'text'],
  ['accent text on tile face', 'accent', 'tile-face', 'text'],
  ['accent text on surface', 'accent', 'surface', 'text'],
  ['focus ring on page', 'accent', 'page', 'ui'],
  ['focus ring on tile face', 'accent', 'tile-face', 'ui'],
  ['tile back edge on page', 'tile-back', 'page', 'ui'],
];

// Marks are graphics (3:1); solid fills carry white text (4.5:1).
// Player marks only ever sit on a card or a sheet, never straight on the felt,
// so those are the two backgrounds checked.
for (let i = 1; i <= 4; i += 1) {
  PAIRS.push([`player ${i} mark on tile face`, `player-${i}`, 'tile-face', 'ui']);
  PAIRS.push([`player ${i} mark on surface`, `player-${i}`, 'surface', 'ui']);
}

/*
 * Informational, not a pass or fail.
 *
 * WCAG 1.4.11 covers interactive components and graphics needed to understand
 * content. The seat cards are neither: they are panels whose text already meets
 * 4.5:1 against the card itself. The interactive tiles, the hand log rows and
 * the history cards, sit on the page background and are bounded by the jade
 * back edge, which is checked above as "tile back edge on page" and must pass.
 * These two are tracked so a dark mode card never silently melts into the felt.
 */
const INFO = [
  ['card face against felt', 'tile-face', 'felt'],
  ['card jade edge against felt', 'tile-back', 'felt'],
];

/** [label, literal foreground, background token, kind] */
const ON_FILL = [
  ['white on tile back', WHITE, 'tile-back', 'text'],
  ['badge text on badge', 'on-badge', 'badge-bg', 'text'],
  ...[1, 2, 3, 4].map((i) => [
    `solid fill text on player ${i}`, 'on-player-solid', `player-${i}-solid`, 'text',
  ]),
];

let failures = 0;
for (const [themeName, tokens] of [['light', LIGHT], ['dark', DARK]]) {
  console.log(`\n===== ${themeName.toUpperCase()} =====`);
  const resolve = (nameOrLiteral) =>
    nameOrLiteral.startsWith('#') ? nameOrLiteral : tokens[nameOrLiteral];

  for (const [label, fg, bg] of INFO) {
    const r = ratio(resolve(fg), resolve(bg));
    console.log(`  note  ${r.toFixed(2).padStart(5)}:1            ${label}`);
  }

  for (const [label, fg, bg, kind] of [...PAIRS, ...ON_FILL]) {
    const f = resolve(fg);
    const b = resolve(bg);
    if (!f || !b) {
      console.log(`  MISSING token for "${label}" (${fg} / ${bg})`);
      failures += 1;
      continue;
    }
    const r = ratio(f, b);
    const need = NEED[kind];
    const ok = r >= need;
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1 (needs ${need})  ${label}  ${f} on ${b}`,
    );
  }
}

console.log(`\n${failures === 0 ? 'All contrast checks pass.' : `${failures} FAILING pair(s).`}`);
process.exit(failures === 0 ? 0 : 1);
