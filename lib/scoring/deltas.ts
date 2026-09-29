import { effectiveFaan, unitFor } from '@/lib/rules/curve';
import type { Rules } from '@/lib/rules/types';
import {
  SEATS,
  type Deltas,
  type Hand,
  type HandType,
  type Seat,
} from './types';

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoringError';
  }
}

function assertFaan(faan: number, rules: Rules): void {
  if (!Number.isInteger(faan)) {
    throw new ScoringError(`Faan must be a whole number, got ${faan}`);
  }
  if (faan < rules.minFaan) {
    throw new ScoringError(
      `Faan must be at least the ${rules.minFaan} faan minimum, got ${faan}`,
    );
  }
}

/**
 * Round a payment to a whole number.
 *
 * A fractional dealer bonus is the only thing that produces a fraction, and a
 * scoreboard of half points helps nobody. Because the winner is paid the sum of
 * what was actually handed over, rounding here can never unbalance a hand.
 */
function roundPayment(amount: number): number {
  return Math.round(amount);
}

/**
 * What one player hands to another, after the dealer bonus.
 *
 * The bonus applies to any payment touching the dealer, whether the dealer is
 * paying or being paid.
 */
function payment(
  base: number,
  from: Seat,
  to: Seat,
  rules: Rules,
  dealerSeat?: Seat,
): number {
  const touchesDealer =
    dealerSeat !== undefined && (from === dealerSeat || to === dealerSeat);
  return roundPayment(touchesDealer ? base * rules.dealerMult : base);
}

/**
 * The four score changes for one hand, indexed by seat.
 *
 * Every hand is settled as a set of payments between players, and the player
 * being paid receives exactly the sum of them. That is what makes a hand sum to
 * zero: not a formula that happens to balance, but the fact that nothing is
 * created or lost in the transfer. It holds for any multiplier, curve or
 * rounding rule.
 *
 * The dealer seat is only needed when a dealer bonus is in play.
 */
export function deltas(hand: Hand, rules: Rules, dealerSeat?: Seat): Deltas {
  const out: [number, number, number, number] = [0, 0, 0, 0];

  switch (hand.type) {
    case 'draw':
      break;

    case 'zaa_wu': {
      if (!Number.isInteger(rules.zaaWuPenalty) || rules.zaaWuPenalty < 0) {
        throw new ScoringError(
          `Zaa Wu penalty must be a whole number of 0 or more, got ${rules.zaaWuPenalty}`,
        );
      }
      let paid = 0;
      for (const seat of SEATS) {
        if (seat === hand.offenderSeat) continue;
        const amount = payment(
          rules.zaaWuPenalty,
          hand.offenderSeat,
          seat,
          rules,
          dealerSeat,
        );
        out[seat] += amount;
        paid += amount;
      }
      out[hand.offenderSeat] -= paid;
      break;
    }

    case 'ceot_cung':
    case 'zi_mo': {
      assertFaan(hand.faan, rules);
      if (hand.type === 'ceot_cung' && hand.winnerSeat === hand.discarderSeat) {
        throw new ScoringError('A player cannot deal in to their own win');
      }

      const unit = unitFor(effectiveFaan(hand, rules), rules);
      const winner = hand.winnerSeat;
      let collected = 0;

      for (const seat of SEATS) {
        if (seat === winner) continue;
        const multiplier =
          hand.type === 'zi_mo'
            ? rules.selfDrawEachMult
            : seat === hand.discarderSeat
              ? rules.discardShooterMult
              : rules.discardOthersMult;

        const amount = payment(
          unit * multiplier,
          seat,
          winner,
          rules,
          dealerSeat,
        );
        out[seat] -= amount;
        collected += amount;
      }

      out[winner] += collected;
      break;
    }

    default: {
      const exhaustive: never = hand;
      throw new ScoringError(
        `Unknown hand type: ${JSON.stringify(exhaustive)}`,
      );
    }
  }

  const sum = out[0] + out[1] + out[2] + out[3];
  if (sum !== 0) {
    throw new ScoringError(
      `Hand does not sum to zero (got ${sum}) for ${JSON.stringify(hand)}`,
    );
  }

  return out;
}

/**
 * Whether a partially filled hand is ready to save. Drives the Save button in
 * the record hand sheet.
 */
export function isCompleteHand(
  draft: {
    type?: HandType | null;
    winnerSeat?: Seat | null;
    discarderSeat?: Seat | null;
    offenderSeat?: Seat | null;
    faan?: number | null;
  },
  rules: Rules,
): boolean {
  const faanOk =
    typeof draft.faan === 'number' &&
    Number.isInteger(draft.faan) &&
    draft.faan >= rules.minFaan;

  switch (draft.type) {
    case 'ceot_cung':
      return (
        draft.winnerSeat != null &&
        draft.discarderSeat != null &&
        draft.winnerSeat !== draft.discarderSeat &&
        faanOk
      );
    case 'zi_mo':
      return draft.winnerSeat != null && faanOk;
    case 'zaa_wu':
      return draft.offenderSeat != null;
    case 'draw':
      return true;
    default:
      return false;
  }
}
