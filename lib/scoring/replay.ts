import { deltas } from './deltas';
import {
  WINDS,
  winnerOf,
  type BySeat,
  type Deltas,
  type GameRules,
  type Hand,
  type Seat,
  type Wind,
} from './types';

/** How many hands a full game runs for: one pass of the four winds. */
const ROUNDS_PER_GAME = WINDS.length;

export interface HandRow {
  /** Position in the hand list, 0 based. */
  index: number;
  /** Hand number as shown in the UI, 1 based. */
  handNumber: number;
  /** Prevailing round this hand was played in. */
  round: Wind;
  /** How many rounds had elapsed, so extra hands past North keep counting. */
  roundIndex: number;
  /** Who dealt this hand. */
  dealerSeat: Seat;
  hand: Hand;
  deltas: Deltas;
  /** Cumulative scores once this hand is applied. */
  scoresAfter: Deltas;
  /** True for hands played after the North round ended. */
  isExtra: boolean;
}

export interface ReplayResult {
  rows: HandRow[];
  /** Cumulative score per seat. */
  scores: Deltas;
  /**
   * Cumulative score per seat over time for the chart, each starting at 0, so
   * every series has hands.length + 1 points.
   */
  series: BySeat<number[]>;
  /** The round the next hand will be played in. */
  currentRound: Wind;
  currentRoundIndex: number;
  /** The seat that deals the next hand. */
  currentDealerSeat: Seat;
  /** True once the North round has ended. Extra hands are still allowed. */
  isComplete: boolean;
  handCount: number;
  /** The change each seat saw in the most recent hand, or zeros before any. */
  lastDeltas: Deltas;
}

/**
 * Replay a whole game from its hand list.
 *
 * Dealer and round are derived here and never stored: if a non-dealer wins the
 * dealer passes to the next seat, and when it passes back to seat 0 the
 * prevailing round advances.
 */
export function replay(game: GameRules): ReplayResult {
  const rows: HandRow[] = [];
  const scores: [number, number, number, number] = [0, 0, 0, 0];
  const series: BySeat<number[]> = [[0], [0], [0], [0]];

  let dealerSeat: Seat = 0;
  let roundIndex = 0;

  game.hands.forEach((hand, index) => {
    // The dealer is passed in because a dealer bonus needs to know who it is.
    const handDeltas = deltas(hand, game.rules, dealerSeat);
    for (let seat = 0; seat < 4; seat += 1) {
      scores[seat] += handDeltas[seat];
      series[seat].push(scores[seat]);
    }

    rows.push({
      index,
      handNumber: index + 1,
      round: WINDS[roundIndex % ROUNDS_PER_GAME],
      roundIndex,
      dealerSeat,
      hand,
      deltas: handDeltas,
      scoresAfter: [scores[0], scores[1], scores[2], scores[3]],
      isExtra: roundIndex >= ROUNDS_PER_GAME,
    });

    // The dealer keeps the seat by winning. Any other win passes it on, and a
    // draw or a false declaration leaves it alone.
    const winner = winnerOf(hand);
    if (winner !== null && winner !== dealerSeat) {
      dealerSeat = (((dealerSeat + 1) % 4) as Seat);
      if (dealerSeat === 0) roundIndex += 1;
    }
  });

  const lastRow = rows[rows.length - 1];

  return {
    rows,
    scores: [scores[0], scores[1], scores[2], scores[3]],
    series,
    currentRound: WINDS[roundIndex % ROUNDS_PER_GAME],
    currentRoundIndex: roundIndex,
    currentDealerSeat: dealerSeat,
    isComplete: roundIndex >= ROUNDS_PER_GAME,
    handCount: game.hands.length,
    lastDeltas: lastRow ? lastRow.deltas : [0, 0, 0, 0],
  };
}
