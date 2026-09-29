import type { Hand } from '@/lib/scoring';
import type { GameRecord } from './types';

/**
 * A one line description of what happened in a hand.
 *
 * One copy, so the hand log and the undo toast can never drift apart. P0-4 moves
 * the terms themselves into a single module; this is the sentence around them.
 */
export function describeHand(hand: Hand, players: GameRecord['players']): string {
  switch (hand.type) {
    case 'ceot_cung':
      return `${players[hand.winnerSeat]} won ${hand.faan} faan off ${players[hand.discarderSeat]}`;
    case 'zi_mo':
      return `${players[hand.winnerSeat]} won by Zi Mo, ${hand.faan} faan`;
    case 'zaa_wu':
      return `${players[hand.offenderSeat]} called a false win`;
    case 'draw':
      return 'Nobody won';
  }
}
