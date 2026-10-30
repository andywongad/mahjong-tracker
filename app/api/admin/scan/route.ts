/**
 * The review data behind the admin token.
 *
 * Everything here is gated on one header compared in constant time. The token
 * never travels in a URL, where it would land in server logs and browser
 * history, and it is never part of the client bundle: it is pasted into the
 * admin page once and kept in that browser.
 */
import { NextResponse } from 'next/server';
import { scanConfig } from '@/lib/scan/config';
import { matchesAdminToken } from '@/lib/scan/gate';
import { serviceClient } from '@/lib/scan/store';
import { summarise, type ScanRow } from '@/lib/scan/accuracy';

/** A row as the admin views need it: what accuracy reads, plus the rest. */
type AdminRow = ScanRow & {
  id: string;
  photo_path: string | null;
  in_test_set: boolean;
  model_used: string | null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'scan-photos';
/** Long enough to look through the list, short enough not to be a link. */
const SIGNED_URL_SECONDS = 600;

const FIELDS =
  'id, created_at, device_id, user_id, is_admin, model_used, used_fallback, ' +
  'input_tokens, output_tokens, est_cost_usd, outcome, scanned_tiles, ' +
  'confirmed_tiles, photo_path, in_test_set';

function guard(request: Request) {
  const config = scanConfig();
  if (!matchesAdminToken(request.headers.get('x-admin-token'), config.adminToken))
    return { ok: false as const, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  const db = serviceClient(config);
  if (!db)
    return { ok: false as const, response: NextResponse.json({ error: 'not-configured' }, { status: 503 }) };
  return { ok: true as const, db };
}

export async function GET(request: Request) {
  const gate = guard(request);
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const view = url.searchParams.get('view') ?? 'stats';

  if (view === 'export') {
    const { data, error } = await gate.db
      .from('scan_events')
      .select(FIELDS)
      .eq('in_test_set', true)
      .not('confirmed_tiles', 'is', null)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as unknown as AdminRow[];
    const cases = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        photo: row.photo_path,
        photoUrl: row.photo_path ? await signedUrl(gate.db, row.photo_path) : null,
        tiles: row.confirmed_tiles?.tiles ?? [],
        flowers:
          (row.confirmed_tiles as { flowers?: string[] } | null)?.flowers ?? [],
      })),
    );
    return NextResponse.json({ cases });
  }

  // Everything inside the window the totals describe. The table is small
  // during an open test; if it stops being small this needs a date filter.
  const { data, error } = await gate.db
    .from('scan_events')
    .select(FIELDS)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as AdminRow[];

  if (view === 'list') {
    const listed = await Promise.all(
      rows
        .filter((row) => row.confirmed_tiles)
        .slice(0, 200)
        .map(async (row) => ({
          id: row.id,
          createdAt: row.created_at,
          model: row.model_used,
          usedFallback: row.used_fallback,
          cost: Number(row.est_cost_usd ?? 0),
          scanned: row.scanned_tiles?.tiles ?? [],
          confirmed: row.confirmed_tiles?.tiles ?? [],
          inTestSet: row.in_test_set,
          photoUrl: row.photo_path ? await signedUrl(gate.db, row.photo_path) : null,
        })),
    );
    return NextResponse.json({ scans: listed });
  }

  return NextResponse.json({ totals: summarise(rows) });
}

/** Mark a scan for the eval set, or take it back out. */
export async function POST(request: Request) {
  const gate = guard(request);
  if (!gate.ok) return gate.response;

  let body: { id?: unknown; inTestSet?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  const { error } = await gate.db
    .from('scan_events')
    .update({ in_test_set: Boolean(body.inTestSet) })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

async function signedUrl(
  db: NonNullable<ReturnType<typeof serviceClient>>,
  path: string,
): Promise<string | null> {
  const { data } = await db.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl ?? null;
}
