'use client';

import { useGames } from '@/lib/game/GamesProvider';

/**
 * Says something only when there is something to say.
 *
 * Games are held in this browser and nowhere else. That is simply how the app
 * works, so it is not worth a permanent banner; what is worth saying is that
 * the network is down, since that is a temporary state people worry about.
 *
 * There is deliberately no promise of syncing here. Changes do queue in an
 * outbox ready for a server, but no server exists yet, so saying "will sync"
 * would be claiming something the app cannot do. When sync is built, this is
 * where the pending count belongs.
 */
export function OfflineBadge() {
  const { online } = useGames();
  if (online) return null;

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
      Offline. Hands are saved on this device and stay there.
    </p>
  );
}
