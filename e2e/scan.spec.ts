import { expect, test, type Page } from '@playwright/test';

/**
 * Scanning a hand, end to end, with the model's answer faked.
 *
 * The server is never called for real: /api/scan and its config are
 * intercepted, so these tests cost nothing and do not depend on a key. What is
 * real is everything on this side of the request — the camera input, the
 * downscale, what goes on the wire, and what the tray does with the answer.
 */

const COMPLETE = [
  'd1', 'd1', 'd1', 'd2', 'd3', 'd4',
  'b5', 'b6', 'b7', 'c9', 'c9', 'c9', 'wE', 'wE',
];

async function allowScanning(page: Page, remaining = 50) {
  await page.route('**/api/scan/config*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      // No site key, so the Cloudflare script is never fetched in a test.
      body: JSON.stringify({ enabled: true, remaining, turnstileSiteKey: null }),
    }),
  );
}

async function openScorer(page: Page): Promise<void> {
  await page.goto('/?game=seed-aug-19-2026');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('button', { name: /Record hand \d+ won by Player A/ })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: /Zi Mo/ }).click();
  await page.getByRole('button', { name: 'Build a hand' }).click();
  await expect(
    page.getByRole('heading', { name: 'The winning hand' }),
  ).toBeVisible();
}

/**
 * A real JPEG carrying an EXIF block, which is what a phone camera produces.
 *
 * Built in the browser so it is a genuine encode, then an APP1 "Exif" segment
 * is spliced in after the start marker, standing in for the one a camera
 * writes — the block that on a phone carries the GPS coordinates.
 */
async function photoWithExif(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    // Larger than the 1568px long edge the client shrinks to, so the test
    // exercises the resize and not only the re-encode.
    canvas.width = 3000;
    canvas.height = 2250;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#0b6b4f';
    context.fillRect(0, 0, 3000, 2250);
    context.fillStyle = '#fdfcf7';
    for (let i = 0; i < 14; i += 1) context.fillRect(50 + i * 210, 950, 180, 300);
    return canvas.toDataURL('image/jpeg', 0.9);
  });

  const jpeg = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

  // APP1: marker, length, "Exif\0\0", then a little-endian TIFF header with no
  // entries. Enough to be a well formed segment that decoders skip.
  const tiff = Buffer.concat([
    Buffer.from('Exif\0\0', 'latin1'),
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]),
  ]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(tiff.length + 2, 0);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), length, tiff]);

  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

async function takePhoto(page: Page, file: Buffer) {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'hand.jpg',
    mimeType: 'image/jpeg',
    buffer: file,
  });
}

test('fills the hand in from a photo, for the player to check', async ({ page }) => {
  await allowScanning(page);
  await page.route('**/api/scan', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scanId: 'scan-under-test',
        tiles: COMPLETE,
        flowers: ['f1'],
        lowConfidence: [6],
        solvable: true,
        remaining: 49,
      }),
    }),
  );

  await openScorer(page);
  await takePhoto(page, await photoWithExif(page));

  await expect(page.getByText('14 of 14 tiles')).toBeVisible();
  await expect(
    page.getByText(/Check these against the table/),
  ).toBeVisible();
  // The flower went to the flowers row, not into the hand.
  await expect(page.getByText('Flowers', { exact: true })).toBeVisible();
  // The engine scored the scanned tiles, as it does for tapped ones: the
  // model never supplies a faan.
  await expect(page.getByText('Total faan')).toBeVisible();
  // The tile the scan was unsure of is marked for checking.
  await expect(
    page.getByRole('button', { name: /check this one/ }),
  ).toHaveCount(1);
});

test('sends no location data with the photo', async ({ page }) => {
  await allowScanning(page);

  let uploaded: string | null = null;
  await page.route('**/api/scan', async (route) => {
    uploaded = JSON.parse(route.request().postData() ?? '{}').image ?? null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scanId: 'scan-1',
        tiles: COMPLETE,
        flowers: [],
        lowConfidence: [],
        solvable: true,
        remaining: 49,
      }),
    });
  });

  await openScorer(page);
  const original = await photoWithExif(page);
  // The file really does carry one before it is sent.
  expect(original.includes(Buffer.from('Exif', 'latin1'))).toBe(true);

  await takePhoto(page, original);
  await expect(page.getByText('14 of 14 tiles')).toBeVisible();

  expect(uploaded).not.toBeNull();
  const sent = Buffer.from(uploaded!, 'base64');
  // Re-encoding through a canvas rebuilds the file from pixels, so the
  // camera's metadata block — GPS included — is not carried over.
  expect(sent.includes(Buffer.from('Exif', 'latin1'))).toBe(false);
  expect(sent.includes(Buffer.from([0xff, 0xe1]))).toBe(false);
  // It is still a JPEG, and the resize really happened.
  expect(sent.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  expect(sent.length).toBeLessThan(original.length);
  const size = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    return { width: bitmap.width, height: bitmap.height };
  }, uploaded!);
  expect(size.width).toBe(1568);
});

test('says what to do when the tiles cannot be read, and keeps the hand', async ({ page }) => {
  await allowScanning(page);
  await page.route('**/api/scan', (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'unreadable' }),
    }),
  );

  await openScorer(page);
  await page.getByRole('button', { name: /Add 5 characters/ }).first().click();
  await takePhoto(page, await photoWithExif(page));

  await expect(page.getByText(/Couldn.t read the tiles/)).toBeVisible();
  // The hand the player had tapped in is untouched.
  await expect(page.getByText('1 of 14 tiles')).toBeVisible();
});

test('refuses at the cap, and says tapping still works', async ({ page }) => {
  await allowScanning(page, 1);
  await page.route('**/api/scan', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'capped', reason: 'device' }),
    }),
  );

  await openScorer(page);
  await takePhoto(page, await photoWithExif(page));

  await expect(page.getByText(/used today.s scans/)).toBeVisible();
  await expect(page.getByText(/tap the tiles in/)).toBeVisible();
});

test('says when scanning is paused for everyone, not just for you', async ({ page }) => {
  await allowScanning(page);
  await page.route('**/api/scan', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'capped', reason: 'global' }),
    }),
  );

  await openScorer(page);
  await takePhoto(page, await photoWithExif(page));
  await expect(page.getByText(/paused for today/)).toBeVisible();
});

test('shows how many are left only when there are few', async ({ page }) => {
  await allowScanning(page, 7);
  await openScorer(page);
  await expect(page.getByText('7 scans left today')).toBeVisible();
});

test('says nothing about the count when there is plenty left', async ({ page }) => {
  await allowScanning(page, 48);
  await openScorer(page);
  await expect(page.getByRole('button', { name: /Scan hand/ })).toBeVisible();
  await expect(page.getByText(/scans left today/)).toHaveCount(0);
});

test('hides the button entirely when scanning is switched off', async ({ page }) => {
  await page.route('**/api/scan/config*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, reason: 'off' }),
    }),
  );

  await openScorer(page);
  await expect(page.getByRole('button', { name: /Scan hand/ })).toHaveCount(0);
  // Tapping the tiles in is unaffected.
  await expect(page.getByRole('button', { name: /Add 5 characters/ })).toBeVisible();
});

test('hides the button when there is no server to ask', async ({ page }) => {
  await page.route('**/api/scan/config*', (route) => route.abort());
  await openScorer(page);
  await expect(page.getByRole('button', { name: /Scan hand/ })).toHaveCount(0);
});
