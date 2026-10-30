import { describe, expect, it, vi } from 'vitest';
import { hashIp, ipOf, matchesAdminToken, verifyTurnstile } from '../gate';
import { scanConfig } from '../config';

const config = (env: Record<string, string> = {}) =>
  scanConfig({ NODE_ENV: 'production', ...env });

const ok = () =>
  vi.fn(async () => new Response(JSON.stringify({ success: true })));
const bad = () =>
  vi.fn(async () => new Response(JSON.stringify({ success: false })));

describe('the bot check', () => {
  it('refuses a request with no token', async () => {
    const result = await verifyTurnstile(
      null,
      config({ TURNSTILE_SECRET_KEY: 'secret' }),
      false,
      ok(),
    );
    expect(result).toEqual({ ok: false, reason: 'missing-token' });
  });

  it('refuses a token Cloudflare rejects', async () => {
    const result = await verifyTurnstile(
      'forged',
      config({ TURNSTILE_SECRET_KEY: 'secret' }),
      false,
      bad(),
    );
    expect(result).toEqual({ ok: false, reason: 'rejected' });
  });

  it('accepts a token Cloudflare accepts', async () => {
    const fetchImpl = ok();
    const result = await verifyTurnstile(
      'good',
      config({ TURNSTILE_SECRET_KEY: 'secret' }),
      false,
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, skipped: false });
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('refuses rather than waving everyone through when the secret is missing', async () => {
    const result = await verifyTurnstile('anything', config(), false, ok());
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
  });

  it('skips the check on a developer machine', async () => {
    const fetchImpl = bad();
    const result = await verifyTurnstile(
      null,
      scanConfig({ NODE_ENV: 'development' }),
      false,
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips the check for an admin', async () => {
    const fetchImpl = bad();
    const result = await verifyTurnstile(
      null,
      config({ TURNSTILE_SECRET_KEY: 'secret' }),
      true,
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats a network failure as a refusal', async () => {
    const result = await verifyTurnstile(
      'good',
      config({ TURNSTILE_SECRET_KEY: 'secret' }),
      false,
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'rejected' });
  });
});

describe('the admin token', () => {
  it('matches the right token', () => {
    expect(matchesAdminToken('s3cret-token', 's3cret-token')).toBe(true);
  });

  it('refuses a wrong one, a short one and a missing one', () => {
    expect(matchesAdminToken('wrong', 's3cret-token')).toBe(false);
    expect(matchesAdminToken('s3cret-toke', 's3cret-token')).toBe(false);
    expect(matchesAdminToken(null, 's3cret-token')).toBe(false);
  });

  it('refuses everything when no token is configured', () => {
    expect(matchesAdminToken('anything', undefined)).toBe(false);
    expect(matchesAdminToken('', '')).toBe(false);
  });
});

describe('the caller address', () => {
  it('hashes with the salt, and never stores the address', () => {
    const hash = hashIp('203.0.113.7', 'salt');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('203');
    expect(hashIp('203.0.113.7', 'other-salt')).not.toBe(hash);
  });

  it('takes the first entry of the forwarded chain, not one the client added', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.7, 10.0.0.1, 192.168.1.1',
    });
    expect(ipOf(headers)).toBe('203.0.113.7');
  });

  it('prefers the real-ip header when the edge sets one', () => {
    const headers = new Headers({
      'x-real-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.1',
    });
    expect(ipOf(headers)).toBe('203.0.113.9');
  });

  it('buckets an unknown address on its own', () => {
    expect(ipOf(new Headers())).toBe('unknown');
  });
});
