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

/**
 * When a hand was written down, over the wire.
 *
 * It gets a column of its own. The obvious shortcut was the hands table's
 * created_at, which already exists and already sounds right, and it is not:
 * it is when the row reached the database, and a push replaces a game's
 * hands wholesale, so every sync restamps every hand of that game. Reading
 * it as the time a hand was played showed a game played on the 2nd with all
 * five of its hands recorded three minutes ago.
 */
describe('when a hand was recorded', () => {
  const played = '2026-11-12T13:42:07.000Z';

  it('sends the time the hand was written down', () => {
    const row = toRow('g1', { ...hands['a discard win'], recordedAt: played });
    expect(row).toMatchObject({ recorded_at: played });
  });

  it('sends null for a hand recorded before the app kept this', () => {
    // Not omitted. Every row in a push is a fresh insert, so there is no
    // earlier value for a default to protect, and null is the column saying
    // it does not know rather than guessing.
    expect(toRow('g1', hands['a discard win'])).toMatchObject({
      recorded_at: null,
    });
  });

  it('carries it on every kind of hand, not only a win', () => {
    for (const hand of Object.values(hands)) {
      const row = toRow('g1', { ...hand, recordedAt: played });
      expect(row).toMatchObject({ recorded_at: played });
    }
  });

  it('never sends created_at, which means something else', () => {
    const row = toRow('g1', { ...hands['a discard win'], recordedAt: played });
    expect('created_at' in row).toBe(false);
  });
});

/**
 * 包 over the wire. The pair travels together or not at all, which is what
 * the table's own check constraint says: a liability belonging to nobody is
 * not a smaller mistake than a missing one.
 */
describe('a hand somebody paid the table for', () => {
  const won: HandRecord = {
    id: 'h9',
    seq: 9,
    type: 'zi_mo',
    winnerSeat: 0,
    faan: 6,
    liability: { seat: 2, reason: 'twelve_pieces' },
  };

  it('sends who paid and why', () => {
    expect(toRow('g1', won)).toMatchObject({
      liable_seat: 2,
      liability_reason: 'twelve_pieces',
    });
  });

  it('sends nulls for a hand nobody was liable for', () => {
    expect(toRow('g1', hands['a self drawn win'])).toMatchObject({
      liable_seat: null,
      liability_reason: null,
      adjustment: null,
    });
  });

  it('never sends one without the other', () => {
    for (const hand of Object.values(hands)) {
      const row = toRow('g1', hand) as Record<string, unknown>;
      expect(row.liable_seat === null).toBe(row.liability_reason === null);
    }
  });

  it('sends nulls on a draw and a false win, which cannot carry one', () => {
    for (const key of ['a draw', 'a false win']) {
      expect(toRow('g1', hands[key])).toMatchObject({ liable_seat: null });
    }
  });

  it('carries amounts entered by hand', () => {
    const settled: HandRecord = {
      id: 'h10',
      seq: 10,
      type: 'draw',
      adjustment: { amounts: [1, 2, -3, 0], note: 'settled at the table' },
    };
    expect(toRow('g1', settled)).toMatchObject({
      adjustment: { note: 'settled at the table' },
    });
  });
});
