/**
 * Keep the photo, but only when the player said so.
 *
 * Nothing reaches this route unless someone chose "Share photo". The bucket is
 * private, the image is never served to anyone but the admin page through a
 * signed URL, and a scheduled job deletes it after ninety days.
 */
import { NextResponse } from 'next/server';
import { scanConfig } from '@/lib/scan/config';
import { DEVICE_ID_PATTERN } from '@/lib/scan/request';
import { attachPhoto, serviceClient } from '@/lib/scan/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'scan-photos';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const config = scanConfig();
  if (!config.enabled)
    return NextResponse.json({ error: 'disabled' }, { status: 503 });

  const db = serviceClient(config);
  if (!db)
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });

  let body: { scanId?: unknown; deviceId?: unknown; image?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const scanId = String(body.scanId ?? '');
  const deviceId = String(body.deviceId ?? '');
  const image = typeof body.image === 'string' ? body.image : '';
  if (!scanId || !DEVICE_ID_PATTERN.test(deviceId) || !image)
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  if (image.length * 0.75 > MAX_IMAGE_BYTES)
    return NextResponse.json({ error: 'image-too-large' }, { status: 413 });

  const path = `${scanId}.jpg`;
  const bytes = Buffer.from(image, 'base64');

  const upload = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (upload.error)
    return NextResponse.json({ error: 'upload-failed' }, { status: 502 });

  const attached = await attachPhoto(db, { scanId, deviceId, path });
  if (!attached) {
    // The row would not take it, so the orphan goes rather than sitting in a
    // bucket with nothing pointing at it and no expiry to catch it.
    await db.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ stored: false });
  }

  return NextResponse.json({ stored: true });
}
