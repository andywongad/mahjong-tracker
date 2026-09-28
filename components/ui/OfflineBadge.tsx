'use client';

import { useGames } from '@/lib/game/GamesProvider';

/**
 * A subtle note that hands are held locally. Shown while offline, or while
 * changes are still waiting to reach the server.
 */
export function OfflineBadge() {
  const { online, pending } = useGames();
  if (online && pending === 0) return null;

  return (
    <p
      className="rounded-lg px-3 py-1.5 text-xs"
      style={{
        background: 'var(--tile-face)',
        border: '1px solid var(--line-strong)',
        color: 'var(--muted)',
      }}
      role="status"
    >
      {online ? 'Saved on this device, will sync' : 'Saved offline, will sync'}
    </p>
  );
}
