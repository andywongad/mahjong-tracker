'use client';

/**
 * The browser half of scanning.
 *
 * Nothing secret is here: the key, the caps and the bot-check secret all live
 * on the server. This file turns a photo into something small enough to send,
 * remembers a device id, and asks the server what it is allowed to do.
 */
import type { BonusKey, TileKey } from '@/lib/tiles';

const DEVICE_KEY = 'mahjong.scan.deviceId';
const PHOTO_CHOICE_KEY = 'mahjong.scan.sharePhotos';

export interface ScanConfigResponse {
  enabled: boolean;
  requireSignIn?: boolean;
  signedIn?: boolean;
  isAdmin?: boolean;
  turnstileSiteKey?: string | null;
  remaining?: number;
}

export interface ScanResult {
  scanId: string;
  tiles: TileKey[];
  flowers: BonusKey[];
  lowConfidence: number[];
  notes?: string;
  solvable: boolean;
  remaining: number;
}

export type ScanFailure =
  | { kind: 'capped'; reason: string }
  | { kind: 'sign-in' }
  | { kind: 'unreadable' }
  | { kind: 'offline' }
  | { kind: 'error' };

/**
 * A random id kept in this browser.
 *
 * Deliberately easy to reset: it is a courtesy limit, not a wall, and anyone
 * who wants around it can clear their storage. It exists so one person's
 * phone cannot quietly spend the whole day's allowance.
 */
export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const made =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_KEY, made);
    return made;
  } catch {
    // Private browsing with storage blocked. A per-session id still works.
    return `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export type PhotoChoice = 'share' | 'no' | 'unasked';

export function photoChoice(): PhotoChoice {
  try {
    const value = localStorage.getItem(PHOTO_CHOICE_KEY);
    return value === 'share' || value === 'no' ? value : 'unasked';
  } catch {
    return 'unasked';
  }
}

/**
 * The choice is kept in localStorage, which is an external store rather than
 * React state: it outlives the component, and another tab can change it. So
 * it is read through a subscription instead of copied into state in an effect.
 */
const photoListeners = new Set<() => void>();

export function subscribePhotoChoice(onChange: () => void): () => void {
  photoListeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    photoListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Server rendering has no storage, and nobody has been asked yet. */
export const photoChoiceOnServer = (): PhotoChoice => 'unasked';

export function setPhotoChoice(choice: PhotoChoice): void {
  try {
    if (choice === 'unasked') localStorage.removeItem(PHOTO_CHOICE_KEY);
    else localStorage.setItem(PHOTO_CHOICE_KEY, choice);
  } catch {
    // Nothing to remember it in; the question will simply be asked again.
  }
  for (const listener of photoListeners) listener();
}

export interface Downscaled {
  base64: string;
  width: number;
  height: number;
}

/**
 * Shrink the photo and re-encode it as JPEG.
 *
 * Re-encoding through a canvas is also what removes the metadata: the output
 * is drawn pixels, so the EXIF block the camera wrote — which on a phone
 * usually carries GPS coordinates — is not carried over. The location never
 * leaves the device. e2e/scan.spec.ts checks that on a file that has one.
 */
export async function downscale(
  file: Blob,
  maxLongEdge = 1568,
  quality = 0.85,
): Promise<Downscaled> {
  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxLongEdge ? maxLongEdge / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), width, height };
  } finally {
    bitmap.close?.();
  }
}

async function authHeader(): Promise<Record<string, string>> {
  // Imported lazily so the scorer does not pull the Supabase client in for
  // somebody who never scans.
  const { supabase } = await import('@/lib/supabase/client');
  const client = supabase();
  if (!client) return {};
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function adminHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('mahjong.scan.adminToken');
    return token ? { 'x-admin-token': token } : {};
  } catch {
    return {};
  }
}

export async function fetchScanConfig(): Promise<ScanConfigResponse> {
  try {
    const response = await fetch(
      `/api/scan/config?deviceId=${encodeURIComponent(deviceId())}`,
      { headers: { ...(await authHeader()), ...adminHeader() } },
    );
    if (!response.ok) return { enabled: false };
    return (await response.json()) as ScanConfigResponse;
  } catch {
    // Offline, or no server at all. An online-only feature stays hidden.
    return { enabled: false };
  }
}

export async function postScan(args: {
  image: string;
  turnstileToken: string | null;
  signal?: AbortSignal;
}): Promise<{ ok: true; result: ScanResult } | { ok: false; failure: ScanFailure }> {
  let response: Response;
  try {
    response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(await authHeader()),
        ...adminHeader(),
      },
      body: JSON.stringify({
        deviceId: deviceId(),
        image: args.image,
        mediaType: 'image/jpeg',
        turnstileToken: args.turnstileToken,
      }),
      signal: args.signal,
    });
  } catch {
    return { ok: false, failure: { kind: 'offline' } };
  }

  if (response.ok)
    return { ok: true, result: (await response.json()) as ScanResult };

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    reason?: string;
  };
  if (response.status === 429)
    return { ok: false, failure: { kind: 'capped', reason: body.reason ?? 'device' } };
  if (response.status === 401) return { ok: false, failure: { kind: 'sign-in' } };
  if (response.status === 422) return { ok: false, failure: { kind: 'unreadable' } };
  return { ok: false, failure: { kind: 'error' } };
}

/** Tell the server what the player settled on. Best effort: never blocks a save. */
export async function postConfirm(
  scanId: string,
  tiles: readonly TileKey[],
  flowers: readonly BonusKey[],
): Promise<void> {
  try {
    await fetch('/api/scan/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scanId, deviceId: deviceId(), tiles, flowers }),
      keepalive: true,
    });
  } catch {
    // The hand is already saved locally; the measurement is not worth an error.
  }
}

export async function postPhoto(scanId: string, image: string): Promise<void> {
  try {
    await fetch('/api/scan/photo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scanId, deviceId: deviceId(), image }),
    });
  } catch {
    // Opting in is a favour, not a transaction.
  }
}
