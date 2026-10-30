/**
 * What the player actually saved, written back onto the scan.
 *
 * This is the measurement the open test exists for: scanned_tiles against
 * confirmed_tiles, with no photo needed. A scan that is never saved stays
 * unconfirmed, which is itself a reading — an abandoned scan is usually a bad
 * one.
 */
import { NextResponse } from 'next/server';
import { scanConfig } from '@/lib/scan/config';
import { DEVICE_ID_PATTERN } from '@/lib/scan/request';
import { confirmScan, serviceClient } from '@/lib/scan/store';
import { isBonusCode, isTileCode } from '@/lib/scan/codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const config = scanConfig();
  const db = serviceClient(config);
  if (!db)
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });

  let body: { scanId?: unknown; deviceId?: unknown; tiles?: unknown; flowers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const scanId = String(body.scanId ?? '');
  const deviceId = String(body.deviceId ?? '');
  if (!scanId || !DEVICE_ID_PATTERN.test(deviceId))
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  // Only real tile codes are stored, so a confirmed hand can be compared with
  // a scanned one without either side having to be cleaned up first.
  const tiles = Array.isArray(body.tiles)
    ? body.tiles.filter((t): t is string => typeof t === 'string' && isTileCode(t))
    : [];
  const flowers = Array.isArray(body.flowers)
    ? body.flowers.filter(
        (f): f is string => typeof f === 'string' && isBonusCode(f),
      )
    : [];

  const written = await confirmScan(db, {
    scanId,
    deviceId,
    tiles: { tiles, flowers },
  });

  // A refusal is not an error worth showing anyone: the hand is already saved,
  // and this is only the measurement.
  return NextResponse.json({ written });
}
