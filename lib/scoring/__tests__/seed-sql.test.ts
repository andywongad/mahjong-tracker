import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replay } from '../replay';
import {
  AUG_19_2026_GAME,
  AUG_19_2026_HANDS,
  AUG_19_2026_RULES,
} from '../fixtures/aug-19-2026';
import type { Hand, Seat } from '../types';

/**
 * supabase/seed.sql is generated from the fixture. These assertions fail if the
 * two drift, which would otherwise seed the database with a different game from
 * the one the engine is tested against.
 */
describe('generated seed SQL', () => {
  const sql = readFileSync(
    new URL('../../../supabase/seed.sql', import.meta.url),
    'utf8',
  );

  const rows = [
    ...sql.matchAll(
      /^\s{4}\((\d+), '(\w+)', (\d+|null), (\d+|null), (\d+|null), (\d+|null)\),?$/gm,
    ),
  ].map(([, seq, type, winner, discarder, offender, faanText]) => ({
    seq: Number(seq),
    type,
    winner: winner === 'null' ? null : Number(winner),
    discarder: discarder === 'null' ? null : Number(discarder),
    offender: offender === 'null' ? null : Number(offender),
    faan: faanText === 'null' ? null : Number(faanText),
  }));

  it('carries every hand from the fixture', () => {
    expect(rows).toHaveLength(AUG_19_2026_HANDS.length);
  });

  it('numbers hands from zero with no gaps', () => {
    expect(rows.map((row) => row.seq)).toEqual(
      AUG_19_2026_HANDS.map((_, index) => index),
    );
  });

  it('matches the fixture hand for hand', () => {
    rows.forEach((row, index) => {
      const hand = AUG_19_2026_HANDS[index];
      expect(row.type, `hand ${index + 1} type`).toBe(hand.type);
      if (hand.type === 'ceot_cung') {
        expect(row.winner).toBe(hand.winnerSeat);
        expect(row.discarder).toBe(hand.discarderSeat);
        expect(row.faan).toBe(hand.faan);
      } else if (hand.type === 'zi_mo') {
        expect(row.winner).toBe(hand.winnerSeat);
        expect(row.discarder).toBeNull();
        expect(row.faan).toBe(hand.faan);
      }
    });
  });

  it('replays to the same final scores as the fixture', () => {
    const rebuilt: Hand[] = rows.map((row) =>
      row.type === 'zi_mo'
        ? {
            type: 'zi_mo',
            winnerSeat: row.winner as Seat,
            faan: row.faan as number,
          }
        : {
            type: 'ceot_cung',
            winnerSeat: row.winner as Seat,
            discarderSeat: row.discarder as Seat,
            faan: row.faan as number,
          },
    );
    const fromSql = replay({
      players: AUG_19_2026_GAME.players,
      rules: AUG_19_2026_RULES,
      hands: rebuilt,
    });
    expect(fromSql.scores).toEqual([-23, -39, 64, -2]);
    expect(fromSql.scores).toEqual(replay(AUG_19_2026_GAME).scores);
  });

  it('records the players and penalty the fixture uses', () => {
    expect(sql).toContain(
      "array['Player A', 'Player B', 'Player C', 'Player D']",
    );
    expect(sql).toContain('13,');
    expect(sql).toContain("date '2026-08-19'");
  });
});
