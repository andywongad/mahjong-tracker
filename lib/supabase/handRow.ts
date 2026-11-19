import type { Adjustment, Liability, Seat } from '@/lib/scoring';

/**
 * The parts of a hand row that two different readers both have to understand.
 *
 * The sync pull and the share page each map rows into hands, by separate
 * routes and for separate reasons, and a column understood by one and not the
 * other is a game that reads differently depending on how it was opened. The
 * mapping lives here once so there is only one of it.
 */
export interface LiabilityColumns {
  liable_seat?: number | null;
  liability_reason?: string | null;
  adjustment?: { amounts: number[]; note?: string } | null;
}

/** Who paid for the table on this hand, if anybody did. */
export function liabilityFrom(row: LiabilityColumns): Liability | undefined {
  // The table constrains these to arrive together; this is the belt to that
  // braces, because a half written row should read as no liability rather
  // than as a liability belonging to nobody.
  if (row.liable_seat == null || !row.liability_reason) return undefined;
  return { seat: row.liable_seat as Seat, reason: row.liability_reason };
}

/** Amounts somebody entered by hand, if they did. */
export function adjustmentFrom(row: LiabilityColumns): Adjustment | undefined {
  const held = row.adjustment;
  if (!held || !Array.isArray(held.amounts) || held.amounts.length !== 4) {
    return undefined;
  }
  const [a, b, c, d] = held.amounts;
  return { amounts: [a, b, c, d], note: held.note };
}
