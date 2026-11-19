import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A hand's columns have to agree in three places, and nothing but reading
 * them together says so.
 *
 * The hands table holds a column; the shared_game_hands function names its
 * columns one by one so a share link can read a game without an account; and
 * the client maps them. Add a column to the table and forget the function and
 * every shared game quietly loses it - which is why 0005 had to recreate the
 * function when it added tiles, and why this file exists.
 */

const DIR = 'supabase/migrations';

/** The function as the newest migration that recreates it leaves it. */
function sharedHandsFunction(): string {
  const files = readdirSync(DIR).sort();
  const latest = files
    .map((name) => readFileSync(`${DIR}/${name}`, 'utf8'))
    .filter((sql) => sql.includes('create function public.shared_game_hands'))
    .pop();
  if (!latest) throw new Error('no migration defines shared_game_hands');
  return latest.slice(latest.indexOf('create function public.shared_game_hands'));
}

describe('the columns a hand is read through', () => {
  const sql = readdirSync(DIR)
    .sort()
    .map((name) => readFileSync(`${DIR}/${name}`, 'utf8'))
    .join('\n');

  it('adds recorded_at to the table', () => {
    expect(sql).toMatch(/add column if not exists recorded_at timestamptz/);
  });

  it('adds the liability columns to the table', () => {
    expect(sql).toMatch(/add column if not exists liable_seat smallint/);
    expect(sql).toMatch(/add column if not exists liability_reason text/);
    expect(sql).toMatch(/add column if not exists adjustment jsonb/);
  });

  it('will not let a liability belong to the winner of the hand', () => {
    // The engine refuses this too. Two locks, because a row written by
    // anything other than this app would reach the engine already wrong.
    expect(sql).toMatch(/liable_seat is distinct from winner_seat/);
  });

  it('keeps a liability off a draw and a false win', () => {
    expect(sql).toMatch(/liable_seat is null or type in \('ceot_cung', 'zi_mo'\)/);
  });

  it('is never given a default, which would invent a time', () => {
    // Every hand played before the column existed has no answer, and a
    // default is indistinguishable from a real one by eye.
    expect(sql).not.toMatch(/recorded_at timestamptz[^;]*default/);
  });

  it('returns every hand column through the shared function', () => {
    const fn = sharedHandsFunction();
    for (const column of [
      'winner_seat',
      'discarder_seat',
      'offender_seat',
      'faan',
      'patterns',
      'is_limit',
      'tiles',
      'recorded_at',
      'liable_seat',
      'liability_reason',
      'adjustment',
    ]) {
      // Once in the returns table, once in the select, or a share link gets
      // a column short.
      expect(fn.split(column).length - 1).toBeGreaterThanOrEqual(2);
    }
  });
});
