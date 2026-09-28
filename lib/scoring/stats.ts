import { replay } from './replay';
import { faanValues, SEATS, type GameRules, type Seat } from './types';

export interface PlayerStats {
  seat: Seat;
  name: string;
  /** Hands won, by either Cheut Chung or Zi Mo. */
  wins: number;
  /** Hands won self drawn. */
  ziMo: number;
  /** Hands where this player dealt in, i.e. discarded the winning tile. */
  ceotCung: number;
  /** False declarations made by this player. */
  zaaWu: number;
  /** Biggest single hand gain, 0 if the player never gained in a hand. */
  biggestHand: number;
  /** Final score. */
  score: number;
  /** Wins at each faan value. */
  winsByFaan: Record<number, number>;
  /** Times dealt in at each faan value. */
  dealtInByFaan: Record<number, number>;

  /** Share of hands played that this player won, from 0 to 1. */
  winRate: number;
  /** Most hands won in a row. */
  longestWinStreak: number;
  /** Share of hands played where this player dealt in, from 0 to 1. */
  ceotCungRate: number;
  /** Hands won while holding the deal. */
  dealerHolds: number;
  /** Share of this player's wins that were self drawn, from 0 to 1. */
  ziMoShare: number;
  /** How often each built pattern appeared in this player's wins. */
  patternCounts: Record<string, number>;
  /** The player's highest faan hand that was built from patterns. */
  signatureHand: SignatureHand | null;
}

/** A player's best built hand, kept for the all time table. */
export interface SignatureHand {
  faan: number;
  patterns: { id: string; count: number }[];
  isLimit: boolean;
}

/**
 * Column totals, mirroring the audit the group kept at the bottom of their
 * spreadsheet. Every hand should be accounted for by exactly one outcome, and
 * the four scores should always sum to zero.
 */
export interface StatsTotals {
  wins: number;
  ziMo: number;
  /** Total deal ins, which equals the number of hands won on a discard. */
  ceotCung: number;
  zaaWu: number;
  draws: number;
  /** Sum of all four scores. Zero in a sound game. */
  score: number;
  /** Hands explained by an outcome: wins plus false wins plus draws. */
  accountedFor: number;
  /** True when every hand is accounted for and the scores cancel out. */
  reconciles: boolean;
}

export interface StatsResult {
  players: PlayerStats[];
  totals: StatsTotals;
  handCount: number;
  isComplete: boolean;
}

function emptyFaanTally(values: number[]): Record<number, number> {
  const tally: Record<number, number> = {};
  for (const value of values) tally[value] = 0;
  return tally;
}

/** The seat that won a hand, or null where nobody did. */
function hand_winner(hand: GameRules['hands'][number]): Seat | null {
  return hand.type === 'ceot_cung' || hand.type === 'zi_mo' ? hand.winnerSeat : null;
}

/** Note a win against the winner: the deal, the patterns, and the best hand. */
function recordWin(
  player: PlayerStats,
  hand: { faan: number; isLimit?: boolean; patterns?: { id: string; count: number }[] },
  dealerSeat: Seat,
): void {
  if (player.seat === dealerSeat) player.dealerHolds += 1;

  if (!hand.patterns || hand.patterns.length === 0) return;

  for (const pattern of hand.patterns) {
    player.patternCounts[pattern.id] =
      (player.patternCounts[pattern.id] ?? 0) + pattern.count;
  }

  // Only hands built from patterns can be a signature hand.
  if (!player.signatureHand || hand.faan > player.signatureHand.faan) {
    player.signatureHand = {
      faan: hand.faan,
      patterns: hand.patterns.map((p) => ({ ...p })),
      isLimit: Boolean(hand.isLimit),
    };
  }
}

/** Count a faan value, making room for one outside the current rules. */
function tally(record: Record<number, number>, faan: number): void {
  record[faan] = (record[faan] ?? 0) + 1;
}

/** Per player totals for the stats screen. */
export function stats(game: GameRules): StatsResult {
  const { rows, scores, isComplete, handCount } = replay(game);

  const values = faanValues(game.rules);
  const players: PlayerStats[] = SEATS.map((seat) => ({
    seat,
    name: game.players[seat],
    wins: 0,
    ziMo: 0,
    ceotCung: 0,
    zaaWu: 0,
    biggestHand: 0,
    score: scores[seat],
    winsByFaan: emptyFaanTally(values),
    dealtInByFaan: emptyFaanTally(values),
    winRate: 0,
    longestWinStreak: 0,
    ceotCungRate: 0,
    dealerHolds: 0,
    ziMoShare: 0,
    patternCounts: {},
    signatureHand: null,
  }));

  // Streaks are counted in playing order, so they are tracked as we go.
  const currentStreak = [0, 0, 0, 0];

  for (const row of rows) {
    for (const seat of SEATS) {
      const gain = row.deltas[seat];
      if (gain > players[seat].biggestHand) players[seat].biggestHand = gain;
    }

    // A win extends that player's streak and ends everyone else's.
    const winner = hand_winner(row.hand);
    for (const seat of SEATS) {
      if (winner === seat) {
        currentStreak[seat] += 1;
        if (currentStreak[seat] > players[seat].longestWinStreak) {
          players[seat].longestWinStreak = currentStreak[seat];
        }
      } else {
        currentStreak[seat] = 0;
      }
    }

    const { hand } = row;
    switch (hand.type) {
      case 'ceot_cung':
        players[hand.winnerSeat].wins += 1;
        tally(players[hand.winnerSeat].winsByFaan, hand.faan);
        players[hand.discarderSeat].ceotCung += 1;
        tally(players[hand.discarderSeat].dealtInByFaan, hand.faan);
        recordWin(players[hand.winnerSeat], hand, row.dealerSeat);
        break;
      case 'zi_mo':
        players[hand.winnerSeat].wins += 1;
        players[hand.winnerSeat].ziMo += 1;
        tally(players[hand.winnerSeat].winsByFaan, hand.faan);
        recordWin(players[hand.winnerSeat], hand, row.dealerSeat);
        break;
      case 'zaa_wu':
        players[hand.offenderSeat].zaaWu += 1;
        break;
      case 'draw':
        break;
    }
  }

  // Rates are over hands played, so an empty game reports zero rather than NaN.
  for (const player of players) {
    player.winRate = handCount > 0 ? player.wins / handCount : 0;
    player.ceotCungRate = handCount > 0 ? player.ceotCung / handCount : 0;
    player.ziMoShare = player.wins > 0 ? player.ziMo / player.wins : 0;
  }

  const draws = rows.filter((row) => row.hand.type === 'draw').length;
  const sum = (pick: (player: PlayerStats) => number) =>
    players.reduce((acc, player) => acc + pick(player), 0);

  const totals: StatsTotals = {
    wins: sum((player) => player.wins),
    ziMo: sum((player) => player.ziMo),
    ceotCung: sum((player) => player.ceotCung),
    zaaWu: sum((player) => player.zaaWu),
    draws,
    score: sum((player) => player.score),
    accountedFor: sum((player) => player.wins) + sum((player) => player.zaaWu) + draws,
    reconciles: false,
  };
  totals.reconciles = totals.accountedFor === handCount && totals.score === 0;

  return { players, totals, handCount, isComplete };
}
