import { describe, expect, it } from 'vitest';
import { toRow } from '../remote';
import type { HandRecord } from '@/lib/game/types';

/**
 * What the hands table will and will not accept.
 *
 * Checked here because the cost of getting it wrong is out of all proportion
 * to the mistake: one rejected row stops the whole outbox, since a failed
 * push stays queued and the loop stops at the first one that fails. A game
 * with a draw in it once wedged every later change, deletes included, and the
 * pull handed those games straight back on every pass.
 */
const hands: Record<string, HandRecord> = {
  'a discard win': {
    id: 'h1',
    seq: 0,
    type: 'ceot_cung',
    winnerSeat: 0,
    discarderSeat: 1,
    faan: 4,
  },
  'a self drawn win': { id: 'h2', seq: 1, type: 'zi_mo', winnerSeat: 2, faan: 5 },
  'a false win': { id: 'h3', seq: 2, type: 'zaa_wu', offenderSeat: 3 },
  'a draw': { id: 'h4', seq: 3, type: 'draw' },
};

/** Columns the table declares not null, so a null here is a rejected row. */
const NOT_NULL = ['id', 'game_id', 'seq', 'type', 'is_limit'] as const;

describe('the columns a hand is written to', () => {
  for (const [name, hand] of Object.entries(hands)) {
    it(`sends nothing null that the table refuses, for ${name}`, () => {
      const row = toRow('g1', hand) as Record<string, unknown>;
      for (const column of NOT_NULL) {
        expect(row[column], column).not.toBe(null);
        expect(row[column], column).not.toBe(undefined);
      }
    });
  }

  it('calls a hand that cannot be a limit hand false rather than unknown', () => {
    expect(toRow('g1', hands['a draw']).is_limit).toBe(false);
    expect(toRow('g1', hands['a false win']).is_limit).toBe(false);
  });

  it('still carries a real limit hand through', () => {
    const limit: HandRecord = { ...hands['a self drawn win'], isLimit: true } as HandRecord;
    expect(toRow('g1', limit).is_limit).toBe(true);
  });
});
