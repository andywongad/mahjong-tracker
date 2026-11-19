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
  /**
   * Hands this player paid the whole table for, under a 包 rule.
   *
   * Counted apart from ceotCung rather than instead of it. A player who fed
   * the winning tile and then carried the bill did both things, and a table
   * reading this wants to see both: one says how often they feed, the other
   * how expensive it got.
   */
  baau: number;
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
  /** How this player's score moved across the game. */
  swing: Swing;
}

/**
 * The shape of a player's night, which a final score hides entirely: someone
 * who ends at nothing may never have moved, or may have been eighty up and
 * given it all back.
 */
export interface Swing {
  /** Highest the score ever reached, and the hand it happened on. */
  high: number;
  highAtHand: number;
  low: number;
  lowAtHand: number;
  /** The biggest climb from any earlier low, and where it started. */
  bestRun: number;
  bestRunFromHand: number;
  /** The biggest fall from any earlier high, and the hands it ran between. */
  worstSlide: number;
  worstSlideFromHand: number;
  worstSlideToHand: number;
  /** How much of the high was handed back by the end. */
  gaveBack: number;
}

/**
 * Who hands their tiles to whom.
 *
 * Deal ins are directional and the direction is the interesting part: that one
 * player feeds another twice while never being fed back is the kind of thing a
 * table argues about but cannot otherwise prove. Only the one who discarded
 * the winning tile counts, so self drawn hands appear nowhere here.
 */
export interface FeedEntry {
  shooterSeat: Seat;
  winnerSeat: Seat;
  /** Hands this shooter fed this winner. */
  hands: number;
  /** Points handed over on those hands, as the shooter's share alone. */
  points: number;
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
  baau: number;
  draws: number;
  /** Sum of all four scores. Zero in a sound game. */
  score: number;
  /** Hands explained by an outcome: wins plus false wins plus draws. */
  accountedFor: number;
  /** True when every hand is accounted for and the scores cancel out. */
  reconciles: boolean;
}

/**
 * How the night ran, when every hand of it was timed.
 *
 * Null unless all of them were. A game is only partly timed while it straddles
 * the version that started keeping this, and a pace worked out from three of
 * nineteen hands would be a confident number about nothing.
 */
export interface StatsTiming {
  /** Minutes from the first hand recorded to the last. */
  minutes: number;
  /** Typical minutes between hands: the median gap, not the mean, so one
   *  long break for food does not become everybody's pace. */
  perHand: number;
  /** The longest pause, and the hand number it followed. */
  longestGap: { minutes: number; afterHand: number } | null;
}

export interface StatsResult {
  players: PlayerStats[];
  /** Every shooter and winner pairing that actually happened. */
  feed: FeedEntry[];
  totals: StatsTotals;
  handCount: number;
  isComplete: boolean;
  /** Null when any hand is untimed, which is every game played before times. */
  timing: StatsTiming | null;
}

/**
 * The shape of a night, from the times its hands were written down.
 *
 * Every hand or nothing: one missing time and the gaps either side of it are
 * two hands wide, which is a quiet way to be wrong. Clocks can also disagree
 * between devices, so a run that finishes before it starts is refused rather
 * than reported as a negative evening.
 */
export function timingOf(
  hands: readonly { readonly recordedAt?: string }[],
): StatsTiming | null {
  if (hands.length < 2) return null;
  const times: number[] = [];
  for (const hand of hands) {
    if (!hand.recordedAt) return null;
    const at = new Date(hand.recordedAt).getTime();
    if (Number.isNaN(at)) return null;
    times.push(at);
  }

  const ordered = [...times].sort((a, b) => a - b);
  const span = ordered[ordered.length - 1] - ordered[0];
  if (span <= 0) return null;

  const gaps: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    gaps.push(ordered[index] - ordered[index - 1]);
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  const widest = Math.max(...gaps);
  const at = gaps.indexOf(widest);

  const toMinutes = (ms: number) => Math.round(ms / 60000);
  return {
    minutes: toMinutes(span),
    perHand: toMinutes(median),
    longestGap:
      widest > 0 ? { minutes: toMinutes(widest), afterHand: at + 1 } : null,
  };
}

function emptyFaanTally(values: number[]): Record<number, number> {
  const tally: Record<number, number> = {};
  for (const value of values) tally[value] = 0;
  return tally;
}

/** The seat that won a hand, or null where nobody did. */
function hand_winner(hand: GameRules['hands'][number]): Seat | null {
  return hand.type === 'ceot_cung' || hand.type === 'zi_mo'
    ? hand.winnerSeat
    : null;
}

/** Note a win against the winner: the deal, the patterns, and the best hand. */
function recordWin(
  player: PlayerStats,
  hand: {
    faan: number;
    isLimit?: boolean;
    patterns?: { id: string; count: number }[];
  },
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

/**
 * How a player's score moved, from the running total after every hand.
 *
 * The run and the slide are measured the way a trader reads a position: the
 * best climb from any earlier low, and the worst fall from any earlier high.
 * Both are a single pass, because an earlier low can only ever help a later
 * high, and the same the other way round.
 */
export function swingOf(series: readonly number[]): Swing {
  const swing: Swing = {
    high: series[0] ?? 0,
    highAtHand: 0,
    low: series[0] ?? 0,
    lowAtHand: 0,
    bestRun: 0,
    bestRunFromHand: 0,
    worstSlide: 0,
    worstSlideFromHand: 0,
    worstSlideToHand: 0,
    gaveBack: 0,
  };

  let low = series[0] ?? 0;
  let lowAt = 0;
  let high = series[0] ?? 0;
  let highAt = 0;

  for (let hand = 0; hand < series.length; hand += 1) {
    const value = series[hand];

    if (value > swing.high) {
      swing.high = value;
      swing.highAtHand = hand;
    }
    if (value < swing.low) {
      swing.low = value;
      swing.lowAtHand = hand;
    }

    if (value - low > swing.bestRun) {
      swing.bestRun = value - low;
      swing.bestRunFromHand = lowAt;
    }
    if (high - value > swing.worstSlide) {
      swing.worstSlide = high - value;
      swing.worstSlideFromHand = highAt;
      swing.worstSlideToHand = hand;
    }

    if (value < low) {
      low = value;
      lowAt = hand;
    }
    if (value > high) {
      high = value;
      highAt = hand;
    }
  }

  swing.gaveBack = swing.high - (series[series.length - 1] ?? 0);
  return swing;
}

/** Per player totals for the stats screen. */
export function stats(game: GameRules): StatsResult {
  const { rows, scores, series, isComplete, handCount } = replay(game);

  const values = faanValues(game.rules);
  const players: PlayerStats[] = SEATS.map((seat) => ({
    seat,
    name: game.players[seat],
    wins: 0,
    ziMo: 0,
    ceotCung: 0,
    zaaWu: 0,
    baau: 0,
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
    swing: {
      high: 0,
      highAtHand: 0,
      low: 0,
      lowAtHand: 0,
      bestRun: 0,
      bestRunFromHand: 0,
      worstSlide: 0,
      worstSlideFromHand: 0,
      worstSlideToHand: 0,
      gaveBack: 0,
    },
  }));

  // Every deal in, by who fed it and who took it.
  const feed: FeedEntry[] = [];
  const feedAt = (shooterSeat: Seat, winnerSeat: Seat): FeedEntry => {
    let entry = feed.find(
      (item) =>
        item.shooterSeat === shooterSeat && item.winnerSeat === winnerSeat,
    );
    if (!entry) {
      entry = { shooterSeat, winnerSeat, hands: 0, points: 0 };
      feed.push(entry);
    }
    return entry;
  };

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
        {
          const entry = feedAt(hand.discarderSeat, hand.winnerSeat);
          entry.hands += 1;
          // What the shooter themselves paid, not what the winner collected.
          entry.points -= row.deltas[hand.discarderSeat];
        }
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

    // Counted after the switch rather than inside it, because it is the same
    // fact whichever way the hand was won, and it is an extra thing about a
    // hand rather than a different kind of hand: a player who fed the tile
    // and then carried the bill is counted under both.
    if ('liability' in hand && hand.liability) {
      players[hand.liability.seat].baau += 1;
    }
  }

  // Swings are read off the running score, which replay already worked out.
  for (const seat of SEATS) {
    players[seat].swing = swingOf(series[seat]);
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
    baau: sum((player) => player.baau),
    draws,
    score: sum((player) => player.score),
    accountedFor:
      sum((player) => player.wins) + sum((player) => player.zaaWu) + draws,
    reconciles: false,
  };
  totals.reconciles = totals.accountedFor === handCount && totals.score === 0;

  return {
    players,
    feed,
    totals,
    handCount,
    isComplete,
    timing: timingOf(game.hands),
  };
}
