import type { Hand } from '@/lib/scoring';
import { termForHandType } from '@/lib/terms';
import type { GameRecord } from './types';

/**
 * A one line description of what happened in a hand.
 *
 * One copy, so the hand log and the undo toast can never drift apart. The terms
 * inside come from the terms module; this is only the sentence around them.
 */
export function describeHand(
  hand: Hand,
  players: GameRecord['players'],
): string {
  switch (hand.type) {
    case 'ceot_cung':
      return `${players[hand.winnerSeat]} won ${hand.faan} faan off ${players[hand.discarderSeat]}`;
    case 'zi_mo':
      return `${players[hand.winnerSeat]} won by ${termForHandType('zi_mo').roman}, ${hand.faan} faan`;
    case 'zaa_wu':
      return `${players[hand.offenderSeat]} called a false win`;
    case 'draw':
      return 'Nobody won';
  }
}
