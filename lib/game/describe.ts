import type { Hand, HandRow } from '@/lib/scoring';
import { glossOf, termForHandType } from '@/lib/terms';
import { liabilityWithDiscarderFor, type Rules } from '@/lib/rules/types';
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

/**
 * The rider on a hand: who paid for the table, or that somebody set the
 * amounts by hand.
 *
 * Kept apart from describeHand because it is a second fact about the same
 * hand rather than a different way of saying the first, and the log sets it
 * in its own quieter type. Null for the ordinary hand, which is nearly all
 * of them.
 */
export function describeRider(
  hand: Hand,
  players: GameRecord['players'],
  rules: Rules,
): string | null {
  if (hand.adjustment) {
    const note = hand.adjustment.note?.trim();
    return note ? `Adjusted · ${note}` : 'Adjusted';
  }
  if (!('liability' in hand) || !hand.liability) return null;

  const who = players[hand.liability.seat];
  const name =
    hand.liability.reason === 'other'
      ? 'Paid for the table'
      : glossOf(hand.liability.reason);

  // Split or not is the difference between one name and two, and a reader
  // settling up needs to know which.
  const shared =
    hand.type === 'ceot_cung' &&
    hand.discarderSeat !== hand.liability.seat &&
    liabilityWithDiscarderFor(rules) === 'split';

  return shared
    ? `包 ${name} · ${who} split it with ${players[hand.discarderSeat]}`
    : `包 ${name} · ${who} paid for the table`;
}

/**
 * What the toast says after a hand is saved.
 *
 * The hand number, then the player the hand turned on and what it did to
 * them: "Hand 7 saved · Player B +20". Not the full sentence the log carries,
 * because this is read in passing, by somebody deciding in a second or two
 * whether they tapped the right seat.
 */
export function summariseSave(
  row: Pick<HandRow, 'handNumber' | 'hand' | 'deltas'>,
  players: GameRecord['players'],
): string {
  const saved = `Hand ${row.handNumber} saved`;
  const seat =
    row.hand.type === 'ceot_cung' || row.hand.type === 'zi_mo'
      ? row.hand.winnerSeat
      : row.hand.type === 'zaa_wu'
        ? row.hand.offenderSeat
        : null;

  // A draw turned on nobody, so there is nobody to name.
  if (seat === null) return `${saved} \u00b7 Nobody won`;

  const delta = row.deltas[seat];
  return `${saved} \u00b7 ${players[seat]} ${delta > 0 ? '+' : ''}${delta}`;
}
