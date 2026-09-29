'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  allEvents,
  clearEvents,
  summarise,
  type Summary,
} from '@/lib/telemetry/events';

/** The query string never changes under us, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

/**
 * A hidden panel for reading the local event log, reached with ?debug=events.
 *
 * Not linked from anywhere in the app. It exists to check whether recording a
 * hand actually got faster, not as a feature.
 */
export function DebugPanel() {
  // The server has no query string, so this reads false until hydration.
  const wanted = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get('debug') === 'events',
    () => false,
  );
  const [hidden, setHidden] = useState(false);
  // Bumped to re-read the log after a clear.
  const [nonce, setNonce] = useState(0);

  const summary = useMemo<Summary | null>(
    () => (wanted ? summarise() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce forces a re-read
    [wanted, nonce],
  );

  if (!wanted || hidden || !summary) return null;

  function exportLog() {
    const blob = new Blob([JSON.stringify(allEvents(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mahjong-events-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const rows: [string, string][] = [
    ['Hands recorded', String(summary.handsRecorded)],
    [
      'Median secs to save',
      summary.medianSecondsToSave === null
        ? '—'
        : `${summary.medianSecondsToSave.toFixed(1)} / 6`,
    ],
    [
      'Corrections per 20',
      summary.correctionsPerTwentyHands === null
        ? '—'
        : `${summary.correctionsPerTwentyHands.toFixed(2)} / 1`,
    ],
    ['Corrections (raw)', String(summary.correctionsWithin2Min)],
    ['Undo used', String(summary.undos)],
    ['Abandoned', String(summary.abandoned)],
    [
      'Abandoned at',
      Object.entries(summary.abandonedAtStep)
        .map(([step, count]) => `${step}: ${count}`)
        .join(', ') || '—',
    ],
  ];

  return (
    <aside
      className="fixed right-2 bottom-2 z-50 max-w-[22rem] rounded-xl p-3 text-xs"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        color: 'var(--ink)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong>Event log</strong>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="px-2"
          style={{ color: 'var(--muted)' }}
        >
          Hide
        </button>
      </div>

      <dl className="flex flex-col gap-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt style={{ color: 'var(--muted)' }}>{label}</dt>
            <dd className="tnum text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={exportLog}
          className="touch flex-1 rounded-lg px-3 text-xs font-semibold"
          style={{ background: 'var(--tile-back)', color: '#fff' }}
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => {
            clearEvents();
            setNonce((n) => n + 1);
          }}
          className="touch rounded-lg px-3 text-xs font-semibold"
          style={{
            border: '1px solid var(--line-strong)',
            color: 'var(--accent)',
          }}
        >
          Clear
        </button>
      </div>

      <p className="mt-2" style={{ color: 'var(--muted)' }}>
        This browser only. Nothing is sent anywhere.
      </p>
    </aside>
  );
}
