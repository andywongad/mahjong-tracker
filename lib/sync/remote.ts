'use client';

/**
 * The account's copy of the games, as Supabase holds it.
 *
 * Column names are not the app's names, and the difference is not decorative:
 * the app says players, the table says player_names. These were checked
 * against the live schema rather than read off the migrations, because the
 * two had already drifted once — 0001 wrote a hand's value as points and 0003
 * renamed it faan.
 *
 * A game's hands are replaced wholesale on every upsert rather than diffed.
 * A game is a few dozen rows at most, the merge upstream has already decided
 * what the hand list should be, and a diff here would be a second place for
 * that decision to live.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Hand, PlayerNames, Seat } from '@/lib/scoring';
import type { GameRecord, HandRecord } from '@/lib/game/types';
import type { Rules } from '@/lib/rules/types';
import type { RemoteGames } from './engine';

interface GameRow {
  id: string;
  date: string;
  player_names: string[];
  rules: Rules;
  rule_set_name: string | null;
  ended_at: string | null;
  share_slug: string;
  created_at: string;
  updated_at: string;
}

interface HandRow {
  id: string;
  game_id: string;
  seq: number;
  type: Hand['type'];
  winner_seat: number | null;
  discarder_seat: number | null;
  offender_seat: number | null;
  faan: number | null;
  patterns: { id: string; count: number }[] | null;
  is_limit: boolean | null;
  tiles: string[] | null;
}

/** Rebuild the engine's discriminated union from a flat row. */
function toHand(row: HandRow): Hand {
  switch (row.type) {
    case 'ceot_cung':
      return {
        type: 'ceot_cung',
        winnerSeat: row.winner_seat as Seat,
        discarderSeat: row.discarder_seat as Seat,
        faan: row.faan ?? 0,
        isLimit: row.is_limit ?? false,
        patterns: row.patterns ?? undefined,
        tiles: row.tiles ?? undefined,
      };
    case 'zi_mo':
      return {
        type: 'zi_mo',
        winnerSeat: row.winner_seat as Seat,
        faan: row.faan ?? 0,
        isLimit: row.is_limit ?? false,
        patterns: row.patterns ?? undefined,
        tiles: row.tiles ?? undefined,
      };
    case 'zaa_wu':
      return { type: 'zaa_wu', offenderSeat: row.offender_seat as Seat };
    case 'draw':
      return { type: 'draw' };
  }
}

/**
 * Flatten a hand back into the columns the table has.
 *
 * Exported for its test: which columns may be null is a property of the
 * table, and getting it wrong here stops every push, not just this one.
 */
export function toRow(gameId: string, hand: HandRecord) {
  const win = hand.type === 'ceot_cung' || hand.type === 'zi_mo';
  return {
    id: hand.id,
    game_id: gameId,
    seq: hand.seq,
    type: hand.type,
    winner_seat: win ? hand.winnerSeat : null,
    discarder_seat: hand.type === 'ceot_cung' ? hand.discarderSeat : null,
    offender_seat: hand.type === 'zaa_wu' ? hand.offenderSeat : null,
    faan: win ? hand.faan : null,
    // Not nullable in the table, which defaults it to false — and an
    // explicit null defeats a default rather than falling back to it. A draw
    // and a false win are not limit hands, so false is also the true answer.
    is_limit: win ? (hand.isLimit ?? false) : false,
    patterns: win ? (hand.patterns ?? null) : null,
    tiles: win ? (hand.tiles ?? null) : null,
  };
}

export function supabaseGames(
  client: SupabaseClient,
  ownerId: string,
): RemoteGames {
  return {
    async list(): Promise<GameRecord[]> {
      const { data: games, error } = await client
        .from('games')
        .select(
          'id, date, player_names, rules, rule_set_name, ended_at, share_slug, created_at, updated_at',
        )
        .eq('owner_id', ownerId);
      if (error) throw new Error(`listing games: ${error.message}`);

      const rows = (games ?? []) as unknown as GameRow[];
      if (rows.length === 0) return [];

      const { data: hands, error: handsError } = await client
        .from('hands')
        .select(
          'id, game_id, seq, type, winner_seat, discarder_seat, offender_seat, faan, patterns, is_limit, tiles',
        )
        .in(
          'game_id',
          rows.map((row) => row.id),
        )
        .order('seq', { ascending: true });
      if (handsError) throw new Error(`listing hands: ${handsError.message}`);

      const byGame = new Map<string, HandRecord[]>();
      for (const row of (hands ?? []) as unknown as HandRow[]) {
        const list = byGame.get(row.game_id) ?? [];
        list.push({ ...toHand(row), id: row.id, seq: row.seq } as HandRecord);
        byGame.set(row.game_id, list);
      }

      return rows.map((row) => ({
        id: row.id,
        date: row.date,
        players: row.player_names as unknown as PlayerNames,
        rules: row.rules,
        ruleSetName: row.rule_set_name ?? undefined,
        endedAt: row.ended_at ?? undefined,
        shareSlug: row.share_slug,
        hands: byGame.get(row.id) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },

    async upsert(game: GameRecord): Promise<void> {
      const { error } = await client.from('games').upsert(
        {
          id: game.id,
          owner_id: ownerId,
          date: game.date,
          player_names: game.players,
          rules: game.rules,
          rule_set_name: game.ruleSetName ?? null,
          ended_at: game.endedAt ?? null,
          share_slug: game.shareSlug,
          created_at: game.createdAt,
          updated_at: game.updatedAt,
        },
        { onConflict: 'id' },
      );
      if (error) throw new Error(`saving game: ${error.message}`);

      // Replace the hand list rather than reconcile it: the merge upstream
      // has already settled what it should be.
      const { error: cleared } = await client
        .from('hands')
        .delete()
        .eq('game_id', game.id);
      if (cleared) throw new Error(`clearing hands: ${cleared.message}`);

      if (game.hands.length === 0) return;
      const { error: written } = await client
        .from('hands')
        .insert(game.hands.map((hand) => toRow(game.id, hand)));
      if (written) throw new Error(`saving hands: ${written.message}`);
    },

    async remove(gameId: string): Promise<void> {
      const { error } = await client.from('games').delete().eq('id', gameId);
      if (error) throw new Error(`deleting game: ${error.message}`);
    },
  };
}
