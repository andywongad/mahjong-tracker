import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleScan } from '../route';
import type { Reader } from '@/lib/scan/read';

/**
 * The store is mocked, so these tests are about the order of the gates: what
 * is refused, and whether anything was spent before refusing it. The counting
 * itself happens inside one Postgres transaction and is exercised by
 * supabase/tests/0006_scan_caps_test.sql against the real function.
 */
const claimScan = vi.fn();
const finishScan = vi.fn(async () => undefined);
const getUser = vi.fn(async () => ({ data: { user: null } }));

vi.mock('@/lib/scan/store', () => ({
  serviceClient: () => ({ auth: { getUser: (...a: unknown[]) => getUser(...(a as [])) } }),
  claimScan: (...a: unknown[]) => claimScan(...(a as [])),
  finishScan: (...a: unknown[]) => finishScan(...(a as [])),
}));

const COMPLETE = [
  'd1', 'd1', 'd1', 'd2', 'd3', 'd4',
  'b5', 'b6', 'b7', 'c9', 'c9', 'c9', 'wE', 'wE',
];

const reader: Reader = vi.fn(async () => ({
  raw: { tiles: COMPLETE.map((code) => ({ code, confidence: 'high' })), flowers: [] },
  inputTokens: 2500,
  outputTokens: 200,
}));

const DEVICE = 'device-abcdef123456';

function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ deviceId: DEVICE, image: 'aGVsbG8=', ...body }),
  });
}

const ORIGINAL = { ...process.env };

/** NODE_ENV is read only on process.env, so the whole object is replaced. */
function setEnv(values: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL, ...values } as NodeJS.ProcessEnv;
}

beforeEach(() => {
  vi.clearAllMocks();
  claimScan.mockResolvedValue({ allowed: true, scanId: 'scan-1', reason: null, remaining: 9 });
  setEnv({
    NODE_ENV: 'development',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-not-real',
    SCAN_IP_SALT: 'test-salt',
  });
});

afterEach(() => {
  process.env = ORIGINAL;
});

describe('the scan endpoint', () => {
  it('reads a hand and hands back the tiles in order', async () => {
    const response = await handleScan(post({}), { reader });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tiles).toEqual(COMPLETE);
    expect(body.scanId).toBe('scan-1');
    expect(body.solvable).toBe(true);
    expect(body.remaining).toBe(8);
  });

  it('records what the scan cost against the row it claimed', async () => {
    await handleScan(post({}), { reader });
    expect(finishScan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scanId: 'scan-1',
        outcome: 'ok',
        inputTokens: 2500,
        outputTokens: 200,
        estCostUsd: expect.closeTo(0.00035, 5),
      }),
    );
  });

  it('is off entirely when the flag says so', async () => {
    setEnv({ SCAN_ENABLED: 'false' });
    const response = await handleScan(post({}), { reader });
    expect(response.status).toBe(503);
    expect(claimScan).not.toHaveBeenCalled();
    expect(reader).not.toHaveBeenCalled();
  });

  it('refuses a request over a cap without calling the model', async () => {
    claimScan.mockResolvedValue({ allowed: false, scanId: null, reason: 'device', remaining: 0 });
    const response = await handleScan(post({}), { reader });

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: 'capped', reason: 'device' });
    expect(reader).not.toHaveBeenCalled();
  });

  it('names which ceiling was hit, so the message can be the right one', async () => {
    claimScan.mockResolvedValue({ allowed: false, scanId: null, reason: 'global', remaining: 0 });
    const body = await (await handleScan(post({}), { reader })).json();
    expect(body.reason).toBe('global');
  });

  it('refuses a device id that is not one', async () => {
    const response = await handleScan(post({ deviceId: 'x' }), { reader });
    expect(response.status).toBe(400);
    expect(claimScan).not.toHaveBeenCalled();
  });

  it('refuses a photo that is not an image we can send', async () => {
    const response = await handleScan(post({ mediaType: 'image/gif' }), { reader });
    expect(response.status).toBe(400);
    expect(reader).not.toHaveBeenCalled();
  });

  it('refuses a payload far too big to be a downscaled photo', async () => {
    const response = await handleScan(post({ image: 'A'.repeat(12_000_000) }), { reader });
    expect(response.status).toBe(413);
    expect(claimScan).not.toHaveBeenCalled();
  });

  it('reports a hand it could not read, having still spent the scan', async () => {
    const nonsense: Reader = vi.fn(async () => ({
      raw: { tiles: [{ code: 'not-a-tile', confidence: 'high' }], flowers: [] },
      inputTokens: 100,
      outputTokens: 10,
    }));
    const response = await handleScan(post({}), { reader: nonsense });

    expect(response.status).toBe(422);
    expect(finishScan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: 'invalid' }),
    );
  });

  it('still closes the row when the model call throws', async () => {
    const broken: Reader = vi.fn(async () => {
      throw new Error('upstream is down');
    });
    const response = await handleScan(post({}), { reader: broken });

    expect(response.status).toBe(502);
    // The call may have been billed, so the scan is spent either way.
    expect(finishScan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: 'error' }),
    );
  });
});

describe('with sign-in switched on', () => {
  beforeEach(() => {
    setEnv({ ...process.env, SCAN_REQUIRE_SIGNIN: 'true' });
  });

  it('refuses an anonymous scan', async () => {
    const response = await handleScan(post({}), { reader });
    expect(response.status).toBe(401);
    expect(claimScan).not.toHaveBeenCalled();
  });

  it('allows a scan with a session, and counts it against the account', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-7' } } } as never);
    const response = await handleScan(post({}, { authorization: 'Bearer token' }), { reader });

    expect(response.status).toBe(200);
    expect(claimScan).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ userId: 'user-7' }),
    );
  });

  it('lets an admin through without a session', async () => {
    setEnv({ ...process.env, SCAN_ADMIN_TOKEN: 'admin-secret-token' });
    const response = await handleScan(
      post({}, { 'x-admin-token': 'admin-secret-token' }),
      { reader },
    );
    expect(response.status).toBe(200);
  });
});

describe('the bot check, in production', () => {
  beforeEach(() => {
    setEnv({
      ...process.env,
      NODE_ENV: 'production',
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
    });
  });

  it('refuses a scan with no token', async () => {
    const response = await handleScan(post({}), { reader });
    expect(response.status).toBe(403);
    expect(claimScan).not.toHaveBeenCalled();
  });

  it('refuses a token Cloudflare rejects', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    const response = await handleScan(post({ turnstileToken: 'forged' }), {
      reader,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(response.status).toBe(403);
    expect(reader).not.toHaveBeenCalled();
  });

  it('allows a token Cloudflare accepts', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    const response = await handleScan(post({ turnstileToken: 'good' }), {
      reader,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(response.status).toBe(200);
  });

  it('lets an admin skip it', async () => {
    setEnv({ ...process.env, SCAN_ADMIN_TOKEN: 'admin-secret-token' });
    const response = await handleScan(
      post({}, { 'x-admin-token': 'admin-secret-token' }),
      { reader },
    );
    expect(response.status).toBe(200);
  });

  it('refuses everyone when the secret was never set', async () => {
    setEnv({ ...process.env, TURNSTILE_SECRET_KEY: undefined });
    const response = await handleScan(post({ turnstileToken: 'good' }), { reader });
    expect(response.status).toBe(503);
  });
});
