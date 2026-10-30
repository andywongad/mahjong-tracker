/**
 * Read a photo of a hand and say what tiles are in it.
 *
 * Public during the open test, so the order here matters: everything that can
 * refuse the request does so before the paid call is made. Switched off,
 * signed out when sign-in is required, failed the bot check, over a cap — each
 * returns before a token is spent.
 *
 * The row is claimed before the call and completed after it, so a scan that
 * dies halfway still counts against the allowance. Spending the money and
 * recording nothing would be the one failure that lets a loop run free.
 */
import { NextResponse } from 'next/server';
import { scanConfig } from '@/lib/scan/config';
import { estimateCost } from '@/lib/scan/cost';
import { verifyTurnstile } from '@/lib/scan/gate';
import { DEVICE_ID_PATTERN, identify } from '@/lib/scan/request';
import { anthropicReader, readHand, type Reader } from '@/lib/scan/read';
import { claimScan, finishScan, serviceClient } from '@/lib/scan/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A downscaled photo is a few hundred KB; well past that is not a photo. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

/** Tests pass their own reader; production builds one from the API key. */
export interface ScanDeps {
  reader?: Reader;
  fetchImpl?: typeof fetch;
}

export async function POST(request: Request) {
  return handleScan(request, {});
}

export async function handleScan(request: Request, deps: ScanDeps) {
  const config = scanConfig();
  if (!config.enabled)
    return NextResponse.json({ error: 'disabled' }, { status: 503 });

  let body: {
    image?: unknown;
    mediaType?: unknown;
    deviceId?: unknown;
    turnstileToken?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const deviceId = String(body.deviceId ?? '');
  if (!DEVICE_ID_PATTERN.test(deviceId))
    return NextResponse.json({ error: 'bad-device-id' }, { status: 400 });

  const image = typeof body.image === 'string' ? body.image : '';
  const mediaType = String(body.mediaType ?? 'image/jpeg') as MediaType;
  if (!image || !MEDIA_TYPES.includes(mediaType))
    return NextResponse.json({ error: 'bad-image' }, { status: 400 });
  // Base64 carries four characters for every three bytes.
  if (image.length * 0.75 > MAX_IMAGE_BYTES)
    return NextResponse.json({ error: 'image-too-large' }, { status: 413 });

  const db = serviceClient(config);
  if (!db)
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });

  const caller = await identify(request, config, db, deviceId);

  if (config.requireSignIn && !caller.userId && !caller.isAdmin)
    return NextResponse.json({ error: 'sign-in-required' }, { status: 401 });

  const bot = await verifyTurnstile(
    typeof body.turnstileToken === 'string' ? body.turnstileToken : null,
    config,
    caller.isAdmin,
    deps.fetchImpl,
  );
  if (!bot.ok)
    return NextResponse.json(
      { error: 'turnstile', reason: bot.reason },
      { status: bot.reason === 'not-configured' ? 503 : 403 },
    );

  const claim = await claimScan(db, config, caller);
  if (!claim.allowed || !claim.scanId)
    return NextResponse.json(
      { error: 'capped', reason: claim.reason, remaining: 0 },
      { status: 429 },
    );

  const reader =
    deps.reader ??
    (config.anthropicKey ? anthropicReader(config.anthropicKey) : null);
  if (!reader) {
    await finishScan(db, {
      scanId: claim.scanId,
      outcome: 'error',
      modelUsed: config.model,
      usedFallback: false,
      inputTokens: 0,
      outputTokens: 0,
      estCostUsd: 0,
      scannedTiles: null,
    });
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  try {
    const result = await readHand(image, mediaType, config, reader);
    const cost = estimateCost(
      result.modelUsed,
      result.inputTokens,
      result.outputTokens,
    );

    await finishScan(db, {
      scanId: claim.scanId,
      outcome: result.outcome,
      modelUsed: result.modelUsed,
      usedFallback: result.usedFallback,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estCostUsd: cost,
      scannedTiles: result.reading
        ? {
            tiles: result.reading.tiles,
            flowers: result.reading.flowers,
            lowConfidence: result.reading.lowConfidence,
          }
        : null,
    });

    if (result.outcome !== 'ok' || !result.reading)
      return NextResponse.json(
        { error: 'unreadable', scanId: claim.scanId },
        { status: 422 },
      );

    return NextResponse.json({
      scanId: claim.scanId,
      tiles: result.reading.tiles,
      flowers: result.reading.flowers,
      lowConfidence: result.reading.lowConfidence,
      notes: result.reading.notes,
      solvable: result.solvable,
      remaining: Math.max(0, claim.remaining - 1),
    });
  } catch {
    // The row stays claimed and is marked an error: the call may well have
    // been billed, so it must still count against the allowance.
    await finishScan(db, {
      scanId: claim.scanId,
      outcome: 'error',
      modelUsed: config.model,
      usedFallback: false,
      inputTokens: 0,
      outputTokens: 0,
      estCostUsd: null,
      scannedTiles: null,
    });
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
