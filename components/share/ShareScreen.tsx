'use client';

import { useMemo } from 'react';
import { replay } from '@/lib/scoring';
import { useSharedGame } from '@/lib/supabase/useSharedGame';
import { hasBackend } from '@/lib/supabase/client';
import { formatGameDate } from '@/lib/game/format';
import type { GameRecord } from '@/lib/game/types';
import { AppHeader } from '@/components/ui/AppHeader';
import { TableSurface } from '@/components/table/TableSurface';
import { HandLog } from '@/components/table/HandLog';
import { TallySummary } from '@/components/table/TallySummary';

/**
 * A game as everyone else sees it: read only, and current.
 *
 * Nothing here can record or edit, so the same table and log components are
 * reused with their controls left off, rather than rebuilt in a read only
 * flavour that could drift from the real thing.
 */
export function ShareScreen({ slug }: { slug: string }) {
  const { game, loading, notFound, error, live } = useSharedGame(slug);

  // The shared shape is the stored shape minus the parts only an owner has.
  const asRecord: GameRecord | null = useMemo(
    () =>
      game
        ? {
            id: game.id,
            date: game.date,
            players: game.players,
            rules: game.rules,
            ruleSetName: game.ruleSetName ?? undefined,
            endedAt: game.endedAt ?? undefined,
            shareSlug: game.shareSlug,
            hands: game.hands.map((hand, index) => ({
              ...hand,
              id: `${game.id}-${index}`,
              seq: index,
            })),
            createdAt: game.updatedAt,
            updatedAt: game.updatedAt,
          }
        : null,
    [game],
  );

  const result = useMemo(() => (asRecord ? replay(asRecord) : null), [asRecord]);

  if (!hasBackend()) {
    return (
      <Message title="Sharing is not set up">
        This copy of the app has no server configured, so share links cannot be
        opened.
      </Message>
    );
  }

  if (loading) {
    return <Message title="Loading the game">One moment.</Message>;
  }

  if (notFound) {
    return (
      <Message title="No game here">
        That link does not match a game. It may have been deleted, or the link may
        be incomplete.
      </Message>
    );
  }

  if (error || !asRecord || !result) {
    return (
      <Message title="Could not load the game">
        {error ?? 'Something went wrong.'}
      </Message>
    );
  }

  return (
    <>
      <AppHeader
        title={formatGameDate(asRecord.date)}
        subtitle={`${asRecord.players.join(' · ')} · watching`}
      />

      <main
        id="main"
        tabIndex={-1}
        className="page-column flex flex-col gap-5 px-4 py-4 pad-safe-bottom"
      >
        {/* No onSelectSeat: a viewer cannot record anything. */}
        <TableSurface
          game={asRecord}
          replay={result}
          endedEarly={Boolean(asRecord.endedAt)}
        />

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Hands</h2>
            <span className="tnum text-xs" style={{ color: 'var(--muted)' }}>
              {result.handCount} played
            </span>
          </div>

          <HandLog
            rows={result.rows}
            game={asRecord}
            readOnly
            footer={result.handCount > 0 ? <TallySummary game={asRecord} /> : null}
          />
        </section>

        <p
          className="text-center text-xs"
          style={{ color: 'var(--muted)' }}
          role="status"
        >
          {live
            ? 'Updating as the game is played.'
            : 'Checking for updates every few seconds.'}
        </p>
      </main>
    </>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh flex-col justify-center gap-3 px-6 py-10"
    >
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        {children}
      </p>
    </main>
  );
}
