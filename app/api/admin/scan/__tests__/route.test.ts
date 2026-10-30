import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';

const from = vi.fn();
vi.mock('@/lib/scan/store', () => ({
  serviceClient: () => ({ from: (...a: unknown[]) => from(...(a as [])) }),
}));

const ORIGINAL = { ...process.env };

function query(builder: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  for (const key of ['select', 'eq', 'not', 'order', 'limit', 'update'])
    chain[key] = vi.fn(() => chain);
  Object.assign(chain, builder);
  // The last call in each chain is awaited, so the object is thenable.
  chain.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: builder.data ?? [], error: null });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...ORIGINAL,
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-not-real',
    SCAN_ADMIN_TOKEN: 'the-real-admin-token',
  } as NodeJS.ProcessEnv;
  from.mockReturnValue(query({ data: [] }));
});

afterEach(() => {
  process.env = ORIGINAL;
});

const get = (token?: string) =>
  GET(
    new Request('https://example.test/api/admin/scan?view=stats', {
      headers: token ? { 'x-admin-token': token } : {},
    }),
  );

describe('the admin endpoint', () => {
  it('refuses a request with no token', async () => {
    const response = await get();
    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it('refuses a wrong token', async () => {
    const response = await get('not-the-token');
    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it('refuses a token that is a prefix of the real one', async () => {
    const response = await get('the-real-admin-toke');
    expect(response.status).toBe(403);
  });

  it('answers the right token', async () => {
    const response = await get('the-real-admin-token');
    expect(response.status).toBe(200);
    expect((await response.json()).totals).toBeTruthy();
  });

  it('refuses everyone when no token is configured at all', async () => {
    process.env = { ...process.env, SCAN_ADMIN_TOKEN: undefined } as NodeJS.ProcessEnv;
    expect((await get('anything')).status).toBe(403);
    expect((await get()).status).toBe(403);
  });

  it('will not mark a scan for the test set without the token', async () => {
    const response = await POST(
      new Request('https://example.test/api/admin/scan', {
        method: 'POST',
        body: JSON.stringify({ id: 'scan-1', inTestSet: true }),
      }),
    );
    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it('marks a scan for the test set with the token', async () => {
    const response = await POST(
      new Request('https://example.test/api/admin/scan', {
        method: 'POST',
        headers: { 'x-admin-token': 'the-real-admin-token' },
        body: JSON.stringify({ id: 'scan-1', inTestSet: true }),
      }),
    );
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith('scan_events');
  });
});
