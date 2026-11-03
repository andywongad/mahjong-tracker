'use client';

/**
 * The night in a few lines, above the tables that prove them.
 *
 * Only for a game that is over: mid-game it would be calling a race that is
 * still being run. It renders nothing when there is nothing worth saying,
 * which is the common case for a game of a few hands and is a real answer
 * rather than an empty state to apologise for.
 */

import { useMemo } from 'react';
import type { StatsResult } from '@/lib/scoring';
import { highlights } from '@/lib/game/highlights';

export function HighlightsSection({
  summary,
  finished,
}: {
  summary: StatsResult;
  /** Played out, or called early. An unfinished game has no story yet. */
  finished: boolean;
}) {
  const found = useMemo(() => highlights(summary), [summary]);

  if (!finished || found.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">How it went</h2>
      {/* Not in a tile. Here a tile means data — the summary table, the hand
        ledger, a seat card — and these are sentences. Boxed and ruled they
        read as four rows to scan rather than four lines to read.

        Bulleted rather than bare, because the dividers were doing one real
        job: the first line usually wraps, and without a marker there is
        nothing to say where one fact ends and the next begins. */}
      <ul className="flex flex-col gap-2">
        {found.map((highlight) => (
          <li key={highlight.id} className="flex gap-2 text-sm">
            <span
              aria-hidden="true"
              className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full"
              style={{ background: 'var(--muted)' }}
            />
            <span className="min-w-0">{highlight.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
