/**
 * Who is allowed to spend an API call.
 *
 * The endpoint is public during the open test, so these are the only things
 * between the key and anyone who finds the URL. None of them is a wall:
 * Turnstile is a bot check, the device id is a cookie by another name, and the
 * IP hash lumps a whole venue together. They are there to make casual abuse
 * cost more than it is worth. The spend limit in the Anthropic console is the
 * backstop that actually holds.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { ScanConfig } from './config';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * The IP, salted and hashed, so a leak of this table is not a list of who
 * played where. The raw address is never written down.
 */
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

/**
 * The caller's address, from the proxy headers Vercel sets.
 *
 * x-forwarded-for is a chain the client can prepend to, so only the first
 * entry — the one the edge appended — is trusted, and a missing header is
 * treated as its own bucket rather than silently sharing one with everybody.
 */
export function ipOf(headers: Headers): string {
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return 'unknown';
}

/** Constant time, so a wrong token cannot be found a character at a time. */
export function matchesAdminToken(
  given: string | null,
  expected: string | undefined,
): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so both are hashed to a fixed width first.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type TurnstileResult =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: 'missing-token' | 'rejected' | 'not-configured' };

/**
 * Verify the bot check, unless this is a developer's own machine or an admin.
 *
 * A missing secret in production is a refusal, not a free pass: the one thing
 * worse than a bot check that annoys people is one that silently is not there.
 */
export async function verifyTurnstile(
  token: string | null,
  config: ScanConfig,
  isAdmin: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (config.isDevelopment || isAdmin) return { ok: true, skipped: true };
  if (!config.turnstileSecret) return { ok: false, reason: 'not-configured' };
  if (!token) return { ok: false, reason: 'missing-token' };

  const body = new URLSearchParams();
  body.set('secret', config.turnstileSecret);
  body.set('response', token);

  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success
      ? { ok: true, skipped: false }
      : { ok: false, reason: 'rejected' };
  } catch {
    return { ok: false, reason: 'rejected' };
  }
}
