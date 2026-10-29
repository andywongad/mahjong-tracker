import { describe, expect, it } from 'vitest';
import { stats, swingOf } from '../stats';
import { OUR_TABLE } from '@/lib/rules/types';
import {
  AUG_19_2026_HANDS,
  AUG_19_2026_PLAYERS,
} from '../fixtures/aug-19-2026';
import type { Hand } from '../types';

function game(hands: readonly Hand[] = AUG_19_2026_HANDS) {
  return {
    players: AUG_19_2026_PLAYERS,
    rules: OUR_TABLE,
    hands: hands.map((hand, index) => ({
      ...hand,
      id: `h${index}`,
      seq: index,
    })),
  };
}

describe('reading a swing off a running score', () => {
  it('finds the high and the low, and when they happened', () => {
    const swing = swingOf([0, 10, -5, 30, 20]);
    expect(swing.high).toBe(30);
    expect(swing.highAtHand).toBe(3);
    expect(swing.low).toBe(-5);
    expect(swing.lowAtHand).toBe(2);
  });

  it('measures the best climb from an earlier low, not from the start', () => {
    // Down to -5 then up to 30 is a run of 35, bigger than 0 to 30.
    const swing = swingOf([0, 10, -5, 30, 20]);
    expect(swing.bestRun).toBe(35);
    expect(swing.bestRunFromHand).toBe(2);
  });

  it('measures the worst fall from an earlier high, not to the end', () => {
    const swing = swingOf([0, 50, 10, 40, 35]);
    expect(swing.worstSlide).toBe(40);
    expect(swing.worstSlideFromHand).toBe(1);
    expect(swing.worstSlideToHand).toBe(2);
  });

  it('says how much of the high was handed back by the end', () => {
    expect(swingOf([0, 50, 10, 40, 35]).gaveBack).toBe(15);
  });

  it('reports nothing moving as nothing moving', () => {
    const swing = swingOf([0, 0, 0]);
    expect(swing).toMatchObject({ high: 0, low: 0, bestRun: 0, worstSlide: 0 });
  });

  it('never claims a run that ran backwards in time', () => {
    // The high comes first, so there is no climb to it from the later low.
    const swing = swingOf([0, 40, 10, -20]);
    expect(swing.bestRun).toBe(40);
    expect(swing.worstSlide).toBe(60);
  });
});

describe('the swing of the reference game', () => {
  const result = stats(game() as never);
  const player = (name: string) => result.players.find((p) => p.name === name)!;

  it('catches the night the third player had', () => {
    // Down to -18 early, up to +89, finishing +64.
    const { swing, score } = player(AUG_19_2026_PLAYERS[2]);
    expect(score).toBe(64);
    expect(swing.low).toBe(-18);
    expect(swing.high).toBe(89);
    expect(swing.bestRun).toBe(107);
    expect(swing.gaveBack).toBe(25);
  });

  it('shows the first player losing more than their final score says', () => {
    const { swing, score } = player(AUG_19_2026_PLAYERS[0]);
    expect(score).toBe(-23);
    // Finished -23, but was -85 at the bottom and slid 103 to get there.
    expect(swing.low).toBe(-85);
    expect(swing.worstSlide).toBe(103);
  });
});

describe('who feeds whom', () => {
  const result = stats(game() as never);
  const between = (shooter: number, winner: number) =>
    result.feed.find(
      (f) => f.shooterSeat === shooter && f.winnerSeat === winner,
    );

  it('counts every deal in once, and nothing else', () => {
    const fed = result.feed.reduce((sum, entry) => sum + entry.hands, 0);
    expect(fed).toBe(result.totals.ceotCung);
  });

  it('keeps the direction, which is the whole point', () => {
    // Seat 1 fed seat 3 twice; seat 3 never fed seat 1 at all.
    expect(between(1, 3)?.hands).toBe(2);
    expect(between(3, 1)).toBeUndefined();
  });

  it('never has a player feeding themselves', () => {
    for (const entry of result.feed) {
      expect(entry.shooterSeat).not.toBe(entry.winnerSeat);
    }
  });

  it('counts the shooter’s own payment, not what the winner collected', () => {
    // Seat 3 fed seat 2 one 3 faan hand: the shooter pays two units of 3.
    expect(between(3, 2)).toMatchObject({ hands: 1, points: 6 });
  });

  it('agrees with each player’s deal in count', () => {
    for (const player of result.players) {
      const fed = result.feed
        .filter((entry) => entry.shooterSeat === player.seat)
        .reduce((sum, entry) => sum + entry.hands, 0);
      expect(fed, player.name).toBe(player.ceotCung);
    }
  });

  it('is empty when nobody ever deals in', () => {
    const selfDrawnOnly = stats(
      game([{ type: 'zi_mo', winnerSeat: 0, faan: 4 }]) as never,
    );
    expect(selfDrawnOnly.feed).toEqual([]);
  });
});
