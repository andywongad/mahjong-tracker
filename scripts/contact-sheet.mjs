/*
 * Build design-review/index.html: every route at every width, before beside
 * after, so a change can be judged rather than described.
 *
 *   node scripts/contact-sheet.mjs
 *
 * Images are referenced, never copied, and the whole folder is gitignored.
 */
import { existsSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'design-review';
const SIZES = [
  { name: 'phone', label: '390 x 844' },
  { name: 'tablet', label: '820 x 1180' },
  { name: 'desktop', label: '1280 x 800' },
];

function shotsIn(phase) {
  const dir = join(ROOT, phase);
  if (!existsSync(dir)) return new Map();
  const found = new Map();
  for (const file of readdirSync(dir)) {
    const match = /^(.+)--(phone|tablet|desktop)\.png$/.exec(file);
    if (!match) continue;
    const [, route, size] = match;
    found.set(`${route}|${size}`, {
      src: `${phase}/${file}`,
      at: statSync(join(dir, file)).mtime,
    });
  }
  return found;
}

const before = shotsIn('before');
const after = shotsIn('after');

const routes = [
  ...new Set([...before.keys(), ...after.keys()].map((key) => key.split('|')[0])),
].sort();

const esc = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function cell(shot, label) {
  if (!shot) {
    return `<div class="miss"><span>${label}</span><p>not captured</p></div>`;
  }
  return `<figure>
      <figcaption>${label} <time>${shot.at.toLocaleString()}</time></figcaption>
      <a href="${shot.src}" target="_blank"><img loading="lazy" src="${shot.src}" alt="${label}"></a>
    </figure>`;
}

const body = routes
  .map((route) => {
    const rows = SIZES.map((size) => {
      const key = `${route}|${size.name}`;
      return `<section class="pair">
        <h3>${esc(size.label)}<span class="sz">${size.name}</span></h3>
        <div class="two">
          ${cell(before.get(key), 'Before')}
          ${cell(after.get(key), 'After')}
        </div>
      </section>`;
    }).join('\n');
    return `<article id="${esc(route)}"><h2>${esc(route)}</h2>${rows}</article>`;
  })
  .join('\n');

const nav = routes
  .map((route) => `<a href="#${esc(route)}">${esc(route)}</a>`)
  .join('');

writeFileSync(
  join(ROOT, 'index.html'),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mahjong tracker, design review</title>
<style>
  :root { color-scheme: light dark; --line:#8883; }
  body { margin:0; font:14px/1.5 ui-sans-serif,system-ui,sans-serif; }
  header { position:sticky; top:0; background:Canvas; border-bottom:1px solid var(--line);
           padding:12px 20px; z-index:2; }
  h1 { margin:0 0 8px; font-size:18px; }
  nav a { display:inline-block; margin-right:12px; font-size:13px; }
  article { padding:24px 20px; border-bottom:1px solid var(--line); }
  h2 { margin:0 0 4px; font-size:16px; text-transform:capitalize; }
  .pair h3 { margin:20px 0 8px; font-size:13px; font-weight:600; color:GrayText; }
  .sz { margin-left:8px; font-weight:400; opacity:.7; }
  .two { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
  figure { margin:0; }
  figcaption { font-size:12px; color:GrayText; margin-bottom:6px;
               display:flex; justify-content:space-between; gap:8px; }
  time { opacity:.65; }
  img { width:100%; border:1px solid var(--line); border-radius:6px; display:block; }
  .miss { border:1px dashed var(--line); border-radius:6px; padding:24px; text-align:center;
          color:GrayText; font-size:12px; }
  .miss span { display:block; font-weight:600; margin-bottom:4px; }
  @media (max-width:800px){ .two { grid-template-columns:1fr; } }
</style></head>
<body>
  <header>
    <h1>Mahjong tracker, design review</h1>
    <nav>${nav}</nav>
  </header>
  ${body}
</body></html>`,
);

console.log(
  `design-review/index.html written: ${routes.length} routes, ` +
    `${before.size} before, ${after.size} after`,
);
