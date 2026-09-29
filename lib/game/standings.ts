import { replay, stats, type SignatureHand } from '@/lib/scoring';
import type { GameRecord } from './types';

export interface StandingRow {
  /** Display name, taken from the most recent spelling used. */
  name: string;
  /** Key used to group, so "ann" and "Ann" are the same player. */
  key: string;
  games: number;
  /** Games where this player had the highest final score, ties included. */
  topFinishes: number;
  wins: number;
  ziMo: number;
  /** Times this player dealt in. */
  ceotCung: number;
  /** Sum of final scores across every game. */
  net: number;

  /** Hands played across every game this player appeared in. */
  hands: number;
  /** Share of those hands won, from 0 to 1. */
  winRate: number;
  /** Share of those hands where this player dealt in, from 0 to 1. */
  ceotCungRate: number;
  /** Longest run of wins within any single game. */
  longestWinStreak: number;
  /** Hands won while holding the deal. */
  dealerHolds: number;
  /** Share of wins that were self drawn, from 0 to 1. */
  ziMoShare: number;
  /** Patterns used most often, best first. */
  topPatterns: { id: string; count: number }[];
  /** Highest faan hand built from patterns, across every game. */
  signatureHand: SignatureHand | null;
}

export interface GameSummary {
  id: string;
  date: string;
  players: GameRecord['players'];
  scores: readonly number[];
  handCount: number;
  /** Played out to the end of the North round. */
  isComplete: boolean;
  /** Called by the scorekeeper before the rounds ran out. */
  endedEarly: boolean;
  /** Done either way, which is what the history list cares about. */
  isFinished: boolean;
  shareSlug: string;
  /** Stake, so a list can show money without reaching for the rules. */
  baseUnit: number;
  currency: string;
}

/** One row per game for the history list, newest first as given. */
export function summarise(games: GameRecord[]): GameSummary[] {
  return games.map((game) => {
    const result = replay(game);
    return {
      id: game.id,
      date: game.date,
      players: game.players,
      scores: result.scores,
      handCount: result.handCount,
      isComplete: result.isComplete,
      endedEarly: Boolean(game.endedAt),
      isFinished: result.isComplete || Boolean(game.endedAt),
      shareSlug: game.shareSlug,
      baseUnit: game.rules.baseUnit,
      currency: game.rules.currency,
    };
  });
}

/**
 * All time standings, grouped by player name without regard to case, ordered by
 * net score.
 */
export function standings(games: GameRecord[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const patternTotals = new Map<string, Record<string, number>>();

  // Oldest first, so the newest spelling of a name is the one that sticks.
  const oldestFirst = [...games].sort((a, b) =>
    a.date === b.date
      ? a.createdAt.localeCompare(b.createdAt)
      : a.date.localeCompare(b.date),
  );

  for (const game of oldestFirst) {
    const summary = stats(game);
    const best = Math.max(...summary.players.map((player) => player.score));

    for (const player of summary.players) {
      const key = player.name.trim().toLowerCase();
      if (key === '') continue;

      const existing = rows.get(key) ?? {
        name: player.name.trim(),
        key,
        games: 0,
        topFinishes: 0,
        wins: 0,
        ziMo: 0,
        ceotCung: 0,
        net: 0,
        hands: 0,
        winRate: 0,
        ceotCungRate: 0,
        longestWinStreak: 0,
        dealerHolds: 0,
        ziMoShare: 0,
        topPatterns: [],
        signatureHand: null,
      };

      const patterns = { ...patternTotals.get(key) };
      for (const [id, count] of Object.entries(player.patternCounts)) {
        patterns[id] = (patterns[id] ?? 0) + count;
      }
      patternTotals.set(key, patterns);

      // The best built hand stands across every game, not just the last one.
      const signature =
        player.signatureHand &&
        (!existing.signatureHand ||
          player.signatureHand.faan > existing.signatureHand.faan)
          ? player.signatureHand
          : existing.signatureHand;

      rows.set(key, {
        ...existing,
        name: player.name.trim(),
        games: existing.games + 1,
        topFinishes: existing.topFinishes + (player.score === best ? 1 : 0),
        wins: existing.wins + player.wins,
        ziMo: existing.ziMo + player.ziMo,
        ceotCung: existing.ceotCung + player.ceotCung,
        net: existing.net + player.score,
        hands: existing.hands + summary.handCount,
        // A streak lives inside one game, so the all time figure is the best of them.
        longestWinStreak: Math.max(
          existing.longestWinStreak,
          player.longestWinStreak,
        ),
        dealerHolds: existing.dealerHolds + player.dealerHolds,
        signatureHand: signature,
      });
    }
  }

  // Rates are only meaningful once the totals are in.
  for (const row of rows.values()) {
    row.winRate = row.hands > 0 ? row.wins / row.hands : 0;
    row.ceotCungRate = row.hands > 0 ? row.ceotCung / row.hands : 0;
    row.ziMoShare = row.wins > 0 ? row.ziMo / row.wins : 0;
    row.topPatterns = Object.entries(patternTotals.get(row.key) ?? {})
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
      .slice(0, 3);
  }

  return [...rows.values()].sort(
    (a, b) => b.net - a.net || a.name.localeCompare(b.name),
  );
}
