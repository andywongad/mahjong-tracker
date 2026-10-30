'use client';

/**
 * Scan accuracy review, behind a token.
 *
 * Not linked from anywhere and not in the sitemap: it is reached by typing the
 * address. The token is pasted in once and kept in this browser, then sent as
 * a header — never as a query string, which would put a long-lived secret in
 * server logs, browser history and any referrer.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Totals } from '@/lib/scan/accuracy';
import {
  adminToken,
  adminTokenOnServer,
  setAdminToken,
  subscribeAdminToken,
} from '@/lib/scan/admin-token';

interface ScanListing {
  id: string;
  createdAt: string;
  model: string | null;
  usedFallback: boolean;
  cost: number;
  scanned: string[];
  confirmed: string[];
  inTestSet: boolean;
  photoUrl: string | null;
}

interface Review {
  totals: Totals | null;
  scans: ScanListing[];
  error: string | null;
}

async function fetchReview(token: string): Promise<Review> {
  const empty = { totals: null, scans: [] };
  try {
    const headers = { 'x-admin-token': token };
    const [statsResponse, listResponse] = await Promise.all([
      fetch('/api/admin/scan?view=stats', { headers }),
      fetch('/api/admin/scan?view=list', { headers }),
    ]);
    if (statsResponse.status === 403 || listResponse.status === 403)
      return { ...empty, error: 'That token was not accepted.' };

    return {
      totals: (await statsResponse.json()).totals ?? null,
      scans: (await listResponse.json()).scans ?? [],
      error: null,
    };
  } catch {
    return { ...empty, error: 'Could not reach the server.' };
  }
}

export default function AdminScanPage() {
  const token = useSyncExternalStore(
    subscribeAdminToken,
    adminToken,
    adminTokenOnServer,
  );
  const [entered, setEntered] = useState('');
  const [totals, setTotals] = useState<Totals | null>(null);
  const [scans, setScans] = useState<ScanListing[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The fetch is an external system, so the state it produces is set from its
  // callback rather than inside the effect body. The cancelled flag stops a
  // slow reply from a token that has since been replaced landing on screen.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetchReview(token).then((review) => {
      if (cancelled) return;
      setTotals(review.totals);
      setScans(review.scans);
      setError(review.error);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function mark(id: string, inTestSet: boolean) {
    await fetch('/api/admin/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ id, inTestSet }),
    });
    setScans((rows) =>
      rows.map((row) => (row.id === id ? { ...row, inTestSet } : row)),
    );
  }

  async function exportSet() {
    const response = await fetch('/api/admin/scan?view=export', {
      headers: { 'x-admin-token': token },
    });
    const body = await response.json();
    await navigator.clipboard?.writeText(JSON.stringify(body, null, 2));
    setError(`Copied ${body.cases?.length ?? 0} cases to the clipboard.`);
  }

  if (!token) {
    return (
      <main className="page-column flex flex-col gap-3 px-4 py-6">
        <h1 className="text-lg font-bold">Scan review</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Paste the admin token. It is kept in this browser and sent as a
          header.
        </p>
        <input
          type="password"
          value={entered}
          onChange={(event) => setEntered(event.target.value)}
          className="touch rounded-lg px-3"
          style={{ border: '1px solid var(--line-strong)' }}
          aria-label="Admin token"
        />
        <button
          type="button"
          onClick={() => setAdminToken(entered)}
          className="touch self-start rounded-lg px-4 text-sm font-semibold"
          style={{ background: 'var(--tile-back)', color: '#fff' }}
        >
          Open
        </button>
        {error && (
          <p className="text-sm" style={{ color: 'var(--loss)' }}>
            {error}
          </p>
        )}
      </main>
    );
  }

  const perTile = totals?.tilesTotal
    ? (totals.tilesCorrect / totals.tilesTotal) * 100
    : null;
  const wholeHand = totals?.confirmed
    ? (totals.exactHands / totals.confirmed) * 100
    : null;

  return (
    <main className="page-wide flex flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-bold">Scan review</h1>
        <div className="flex gap-3">
          <button type="button" onClick={exportSet} className="text-sm underline">
            Export test set
          </button>
          <button
            type="button"
            onClick={() => setAdminToken('')}
            className="text-sm underline"
            style={{ color: 'var(--muted)' }}
          >
            Forget token
          </button>
        </div>
      </header>

      {error && <p className="text-sm">{error}</p>}

      {totals && (
        <>
          <section className="grid grid-cols-2 gap-2 tablet:grid-cols-4">
            <Stat label="Scans" value={String(totals.scans)} />
            <Stat label="Devices" value={String(totals.devices)} />
            <Stat
              label="Confirmed"
              value={`${pct(totals.confirmed, totals.scans)}%`}
              note={`${totals.confirmed} of ${totals.scans}`}
            />
            <Stat
              label="Whole hand"
              value={wholeHand === null ? '—' : `${wholeHand.toFixed(1)}%`}
              note="every tile right"
            />
            <Stat
              label="Per tile"
              value={perTile === null ? '—' : `${perTile.toFixed(1)}%`}
              note={`${totals.tilesCorrect} of ${totals.tilesTotal}`}
            />
            <Stat
              label="Fallback"
              value={`${pct(totals.fallbacks, totals.scans)}%`}
              note={`${totals.fallbacks} scans`}
            />
            <Stat label="Total cost" value={`$${totals.costUsd.toFixed(4)}`} />
            <Stat
              label="Per scan"
              value={
                totals.scans
                  ? `$${(totals.costUsd / totals.scans).toFixed(5)}`
                  : '—'
              }
            />
          </section>

          <Panel title="Most confused tiles">
            {totals.confusions.length === 0 ? (
              <Empty>Nothing confused yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--muted)' }}>
                    <th className="py-1 text-left font-semibold">Read as</th>
                    <th className="py-1 text-left font-semibold">Actually</th>
                    <th className="py-1 text-right font-semibold">Times</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.confusions.slice(0, 25).map((row) => (
                    <tr key={`${row.scanned}-${row.actual}`}>
                      <td className="py-1">{row.scanned}</td>
                      <td className="py-1">{row.actual}</td>
                      <td className="tnum py-1 text-right">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Scans by day">
            <table className="w-full text-sm">
              <tbody>
                {totals.byDay.map((row) => (
                  <tr key={row.day}>
                    <td className="py-1">{row.day}</td>
                    <td className="tnum py-1 text-right">{row.scans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      <Panel title={`Confirmed scans (${scans.length})`}>
        {scans.length === 0 ? (
          <Empty>No confirmed scans yet.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {scans.map((scan) => (
              <li
                key={scan.id}
                className="flex flex-col gap-2 rounded-lg p-2"
                style={{ border: '1px solid var(--line)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span style={{ color: 'var(--muted)' }}>
                    {scan.createdAt.replace('T', ' ').slice(0, 16)} ·{' '}
                    {scan.model}
                    {scan.usedFallback && ' · fallback'}
                  </span>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={scan.inTestSet}
                      onChange={(event) => void mark(scan.id, event.target.checked)}
                    />
                    In test set
                  </label>
                </div>
                {scan.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scan.photoUrl}
                    alt=""
                    className="max-h-48 w-auto rounded"
                  />
                )}
                <Row label="Read" tiles={scan.scanned} other={scan.confirmed} />
                <Row label="Saved" tiles={scan.confirmed} other={scan.scanned} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  );
}

/** A tile the other side does not account for is the interesting one. */
function Row({
  label,
  tiles,
  other,
}: {
  label: string;
  tiles: string[];
  other: string[];
}) {
  const remaining = [...other];
  return (
    <p className="flex flex-wrap items-baseline gap-1 text-xs">
      <span className="w-12 shrink-0" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      {tiles.map((tile, index) => {
        const at = remaining.indexOf(tile);
        if (at >= 0) remaining.splice(at, 1);
        return (
          <span
            key={`${tile}-${index}`}
            className="tnum rounded px-1"
            style={
              at >= 0
                ? undefined
                : { background: 'var(--shooter)', color: 'var(--on-shooter)' }
            }
          >
            {tile}
          </span>
        );
      })}
    </p>
  );
}

const pct = (part: number, whole: number) =>
  whole ? ((part / whole) * 100).toFixed(1) : '0.0';

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      className="flex flex-col rounded-lg px-3 py-2"
      style={{ background: 'var(--tile-face)', border: '1px solid var(--line)' }}
    >
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="tnum text-lg font-bold">{value}</span>
      {note && (
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {note}
        </span>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  );
}
