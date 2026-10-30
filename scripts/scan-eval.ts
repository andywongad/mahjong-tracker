/**
 * Measure how well scanning reads a known set of hands.
 *
 * Point it at a folder of photos, each beside a .json of the tiles that are
 * actually in it, and it runs every one through each model and prints what it
 * got right and what it cost. This is how a change to the prompt, the model or
 * the image size is settled: by measurement, not by argument.
 *
 *   npm run scan:eval
 *   npm run scan:eval -- --models claude-haiku-5-5 --long-edge 2576
 *
 * The test set comes from the admin page's export, which writes the photo and
 * the tiles the player confirmed. ANTHROPIC_API_KEY has to be set; this one
 * does make real calls, which is why nothing in the test suite does.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { compareHand } from '../lib/scan/accuracy';
import { estimateCost } from '../lib/scan/cost';
import { anthropicReader } from '../lib/scan/read';
import { validateReading } from '../lib/scan/validate';
import { scanConfig } from '../lib/scan/config';

const PHOTOS = 'design-reference/scan-photos';
const DEFAULT_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5'];

interface Case {
  name: string;
  image: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  tiles: string[];
}

interface Tally {
  cases: number;
  exact: number;
  tilesCorrect: number;
  tilesTotal: number;
  invalid: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  confusions: Map<string, number>;
}

function flag(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1]! : fallback;
}

const MEDIA: Record<string, Case['mediaType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function loadCases(): Promise<Case[]> {
  let files: string[];
  try {
    files = await readdir(PHOTOS);
  } catch {
    throw new Error(`No ${PHOTOS} folder. Export a test set from /admin/scan.`);
  }

  const cases: Case[] = [];
  for (const file of files.sort()) {
    const extension = extname(file).toLowerCase();
    const mediaType = MEDIA[extension];
    if (!mediaType) continue;

    const stem = basename(file, extension);
    let expected: { tiles?: string[] };
    try {
      expected = JSON.parse(await readFile(join(PHOTOS, `${stem}.json`), 'utf8'));
    } catch {
      console.warn(`  skipping ${file}: no ${stem}.json beside it`);
      continue;
    }
    if (!Array.isArray(expected.tiles)) {
      console.warn(`  skipping ${file}: its json has no tiles array`);
      continue;
    }

    cases.push({
      name: stem,
      image: (await readFile(join(PHOTOS, file))).toString('base64'),
      mediaType,
      tiles: expected.tiles,
    });
  }
  return cases;
}

function blank(): Tally {
  return {
    cases: 0,
    exact: 0,
    tilesCorrect: 0,
    tilesTotal: 0,
    invalid: 0,
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    confusions: new Map(),
  };
}

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set.');

  const models = flag('models', DEFAULT_MODELS.join(',')).split(',');
  const effort = flag('effort', scanConfig().effort) as ReturnType<
    typeof scanConfig
  >['effort'];
  const cases = await loadCases();
  if (cases.length === 0) throw new Error(`No photos with tiles in ${PHOTOS}.`);

  console.log(`${cases.length} hands, ${models.join(' and ')}, effort ${effort}\n`);

  const reader = anthropicReader(key);
  const results: Record<string, Tally> = {};

  for (const model of models) {
    const tally = blank();
    results[model] = tally;
    console.log(`${model}`);

    for (const testCase of cases) {
      const output = await reader({
        model,
        image: testCase.image,
        mediaType: testCase.mediaType,
        effort,
        maxTokens: 4096,
      });

      tally.cases += 1;
      tally.inputTokens += output.inputTokens;
      tally.outputTokens += output.outputTokens;
      tally.cost +=
        estimateCost(model, output.inputTokens, output.outputTokens) ?? 0;

      const checked = validateReading(output.raw);
      if (!checked.ok) {
        tally.invalid += 1;
        tally.tilesTotal += testCase.tiles.length;
        console.log(`  ${testCase.name.padEnd(28)} invalid (${checked.error})`);
        continue;
      }

      const comparison = compareHand(checked.reading.tiles, testCase.tiles);
      if (comparison.exact) tally.exact += 1;
      tally.tilesCorrect += comparison.correct;
      tally.tilesTotal += comparison.total;
      for (const pair of comparison.confusions) {
        const name = `${pair.scanned} read for ${pair.actual}`;
        tally.confusions.set(name, (tally.confusions.get(name) ?? 0) + 1);
      }

      console.log(
        `  ${testCase.name.padEnd(28)} ${comparison.exact ? 'exact' : `${comparison.correct}/${comparison.total}`}` +
          (comparison.confusions.length
            ? `  (${comparison.confusions.map((c) => `${c.scanned}→${c.actual}`).join(', ')})`
            : ''),
      );
    }
    console.log('');
  }

  console.log('model                     whole hand   per tile  invalid   tokens in/out   $/scan');
  for (const [model, tally] of Object.entries(results)) {
    const whole = ((tally.exact / tally.cases) * 100).toFixed(1);
    const perTile = tally.tilesTotal
      ? ((tally.tilesCorrect / tally.tilesTotal) * 100).toFixed(1)
      : '0.0';
    console.log(
      `${model.padEnd(25)} ${whole.padStart(9)}% ${perTile.padStart(9)}% ` +
        `${String(tally.invalid).padStart(8)}  ` +
        `${String(Math.round(tally.inputTokens / tally.cases)).padStart(6)}/` +
        `${String(Math.round(tally.outputTokens / tally.cases)).padEnd(5)} ` +
        `$${(tally.cost / tally.cases).toFixed(5)}`,
    );
  }

  for (const [model, tally] of Object.entries(results)) {
    const worst = [...tally.confusions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (worst.length === 0) continue;
    console.log(`\n${model} got these wrong most often:`);
    for (const [name, count] of worst) console.log(`  ${count}x  ${name}`);
  }

  const report = join(PHOTOS, 'last-eval.json');
  await writeFile(
    report,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(results).map(([model, tally]) => [
          model,
          { ...tally, confusions: Object.fromEntries(tally.confusions) },
        ]),
      ),
      null,
      2,
    ),
  );
  console.log(`\nWritten to ${report}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
