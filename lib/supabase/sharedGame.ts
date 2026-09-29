'use client';

import type { Rules } from '@/lib/rules/types';
import type { Hand, HandPattern, PlayerNames } from '@/lib/scoring';
import { supabase } from './client';

/** A shared game as the read only functions return it. */
export interface SharedGame {
  id: string;
  date: string;
  players: PlayerNames;
  rules: Rules;
  ruleSetName: string | null;
  endedAt: string | null;
  shareSlug: string;
  updatedAt: string;
  hands: Hand[];
}

interface GameRow {
  id: string;
  date: string;
  player_names: string[];
  rules: Rules;
  rule_set_name: string | null;
  ended_at: string | null;
  share_slug: string;
  updated_at: string;
}

interface HandRow {
  id: string;
  seq: number;
  type: Hand['type'];
  winner_seat: number | null;
  discarder_seat: number | null;
  offender_seat: number | null;
  faan: number | null;
  patterns: HandPattern[] | null;
  is_limit: boolean | null;
}

/** Rebuild the engine's discriminated union from a flat row. */
function toHand(row: HandRow): Hand {
  switch (row.type) {
    case 'ceot_cung':
      return {
        type: 'ceot_cung',
        winnerSeat: row.winner_seat as 0 | 1 | 2 | 3,
        discarderSeat: row.discarder_seat as 0 | 1 | 2 | 3,
        faan: row.faan ?? 0,
        isLimit: row.is_limit ?? false,
        patterns: row.patterns ?? undefined,
      };
    case 'zi_mo':
      return {
        type: 'zi_mo',
        winnerSeat: row.winner_seat as 0 | 1 | 2 | 3,
        faan: row.faan ?? 0,
        isLimit: row.is_limit ?? false,
        patterns: row.patterns ?? undefined,
      };
    case 'zaa_wu':
      return {
        type: 'zaa_wu',
        offenderSeat: row.offender_seat as 0 | 1 | 2 | 3,
      };
    case 'draw':
      return { type: 'draw' };
  }
}

export class ShareError extends Error {}

/**
 * Read a shared game.
 *
 * Both calls go through security definer functions rather than the tables, so
 * an unknown slug simply returns nothing and the owner id is never exposed.
 * Hands are only fetched when something has actually changed, which is what
 * lets the page poll cheaply.
 */
export async function fetchSharedGame(
  slug: string,
  knownUpdatedAt?: string | null,
): Promise<{ game: SharedGame | null; unchanged: boolean }> {
  const client = supabase();
  if (!client) throw new ShareError('This build has no server configured.');

  const { data: games, error } = await client.rpc('shared_game', { slug });
  if (error) throw new ShareError(error.message);

  const row = (games as GameRow[] | null)?.[0];
  if (!row) return { game: null, unchanged: false };

  // Nothing has moved, so the hands are not worth fetching again.
  if (knownUpdatedAt && row.updated_at === knownUpdatedAt) {
    return { game: null, unchanged: true };
  }

  const { data: hands, error: handsError } = await client.rpc(
    'shared_game_hands',
    {
      slug,
    },
  );
  if (handsError) throw new ShareError(handsError.message);

  return {
    game: {
      id: row.id,
      date: row.date,
      players: row.player_names as unknown as PlayerNames,
      rules: row.rules,
      ruleSetName: row.rule_set_name,
      endedAt: row.ended_at,
      shareSlug: row.share_slug,
      updatedAt: row.updated_at,
      hands: ((hands as HandRow[] | null) ?? []).map(toHand),
    },
    unchanged: false,
  };
}
