import { describe, expect, it } from 'vitest';
import { replay } from '../replay';
import { stats } from '../stats';
import { AUG_19_2026_GAME } from '../fixtures/aug-19-2026';
import { SEATS } from '../types';

/**
 * The reference game. Every number here was taken from the group's real
 * spreadsheet, so a change that breaks these assertions is a scoring bug.
 */
describe('Aug 19 2026 reference game', () => {
  const result = replay(AUG_19_2026_GAME);
  const summary = stats(AUG_19_2026_GAME);

  it('has 19 hands', () => {
    expect(result.handCount).toBe(19);
    expect(result.rows).toHaveLength(19);
  });

  it('produces the final scores Player A -23, Player B -39, Player C +64, Player D -2', () => {
    expect(result.scores).toEqual([-23, -39, 64, -2]);
  });

  it('agrees between replay and stats on the final scores', () => {
    expect(summary.players.map((p) => p.score)).toEqual([-23, -39, 64, -2]);
  });

  it('names players by seat', () => {
    expect(summary.players.map((p) => p.name)).toEqual([
      'Player A',
      'Player B',
      'Player C',
      'Player D',
    ]);
  });

  it('plays hands 1 to 6 in the East round', () => {
    for (const row of result.rows.slice(0, 6)) {
      expect(row.round, `hand ${row.handNumber}`).toBe('east');
    }
  });

  it('plays hands 7 to 10 in the South round', () => {
    for (const row of result.rows.slice(6, 10)) {
      expect(row.round, `hand ${row.handNumber}`).toBe('south');
    }
  });

  it('plays hands 11 to 15 in the West round', () => {
    for (const row of result.rows.slice(10, 15)) {
      expect(row.round, `hand ${row.handNumber}`).toBe('west');
    }
  });

  it('plays hands 16 to 19 in the North round', () => {
    for (const row of result.rows.slice(15, 19)) {
      expect(row.round, `hand ${row.handNumber}`).toBe('north');
    }
  });

  it('is complete after hand 19', () => {
    expect(result.isComplete).toBe(true);
  });

  it('is not complete before hand 19', () => {
    const upToHand18 = replay({
      ...AUG_19_2026_GAME,
      hands: AUG_19_2026_GAME.hands.slice(0, 18),
    });
    expect(upToHand18.isComplete).toBe(false);
    expect(upToHand18.currentRound).toBe('north');
  });

  it('counts wins as 4, 3, 7, 5', () => {
    expect(summary.players.map((p) => p.wins)).toEqual([4, 3, 7, 5]);
  });

  it('counts Zi Mo as 2, 1, 4, 1', () => {
    expect(summary.players.map((p) => p.ziMo)).toEqual([2, 1, 4, 1]);
  });

  it('counts Cheut Chung, meaning dealt in, as 2, 4, 4, 1', () => {
    expect(summary.players.map((p) => p.ceotCung)).toEqual([2, 4, 4, 1]);
  });

  it('counts no Zaa Wu', () => {
    expect(summary.players.map((p) => p.zaaWu)).toEqual([0, 0, 0, 0]);
  });

  it('records biggest hands of 30, 36, 30, 36', () => {
    expect(summary.players.map((p) => p.biggestHand)).toEqual([30, 36, 30, 36]);
  });

  it('keeps every hand zero sum', () => {
    for (const row of result.rows) {
      const sum = row.deltas.reduce((a, b) => a + b, 0);
      expect(sum, `hand ${row.handNumber}`).toBe(0);
    }
  });

  it('keeps the running totals zero sum at every point in the series', () => {
    for (let i = 0; i <= result.handCount; i += 1) {
      const sum = SEATS.reduce<number>(
        (acc, seat) => acc + result.series[seat][i],
        0,
      );
      expect(sum, `after ${i} hands`).toBe(0);
    }
  });

  it('builds one chart series per player, each starting at zero', () => {
    for (const seat of SEATS) {
      expect(result.series[seat]).toHaveLength(20);
      expect(result.series[seat][0]).toBe(0);
    }
    expect(SEATS.map((s) => result.series[s].at(-1))).toEqual([
      -23, -39, 64, -2,
    ]);
  });

  it('tallies wins by points so they add up to each win count', () => {
    for (const player of summary.players) {
      const total = Object.values(player.winsByFaan).reduce((a, b) => a + b, 0);
      expect(total, player.name).toBe(player.wins);
    }
  });

  it('tallies dealt in by points so they add up to each dealt in count', () => {
    for (const player of summary.players) {
      const total = Object.values(player.dealtInByFaan).reduce(
        (a, b) => a + b,
        0,
      );
      expect(total, player.name).toBe(player.ceotCung);
    }
  });
});
