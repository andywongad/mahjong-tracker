/**
 * What the client needs to know before showing the button.
 *
 * The flag lives in a server environment variable, and the page that shows the
 * button is prerendered, so it cannot be read at render time. Asking here
 * keeps the server the only place scanning is turned on or off, and carries
 * the remaining count in the same breath. A request that fails — offline, or
 * the endpoint missing — leaves the button hidden, which is the right way for
 * an online-only feature to fail in an offline-first app.
 */
import { NextResponse } from 'next/server';
import { scanConfig } from '@/lib/scan/config';
import { DEVICE_ID_PATTERN, identify } from '@/lib/scan/request';
import { remainingScans, serviceClient } from '@/lib/scan/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const config = scanConfig();
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId') ?? '';

  if (!config.enabled)
    return NextResponse.json({ enabled: false, reason: 'off' });

  const db = serviceClient(config);
  if (!db) return NextResponse.json({ enabled: false, reason: 'off' });

  if (!DEVICE_ID_PATTERN.test(deviceId))
    return NextResponse.json({ error: 'bad-device-id' }, { status: 400 });

  const caller = await identify(request, config, db, deviceId);
  const remaining = await remainingScans(db, config, caller);

  return NextResponse.json({
    enabled: true,
    requireSignIn: config.requireSignIn,
    signedIn: Boolean(caller.userId),
    isAdmin: caller.isAdmin,
    turnstileSiteKey: config.isDevelopment ? null : config.turnstileSiteKey,
    remaining,
  });
}
