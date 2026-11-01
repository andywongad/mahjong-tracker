import { describe, expect, it } from 'vitest';
import { mergeGames, sameGame } from '../merge';
import { OUR_TABLE } from '@/lib/rules/types';
import type { GameRecord, HandRecord } from '@/lib/game/types';

const hand = (id: string, seq: number, faan = 3): HandRecord => ({
  id,
  seq,
  type: 'ceot_cung',
  winnerSeat: 0,
  discarderSeat: 1,
  faan,
});

const game = (over: Partial<GameRecord> = {}): GameRecord => ({
  id: 'game-1',
  date: '2026-11-01',
  players: ['A', 'B', 'C', 'D'],
  rules: OUR_TABLE,
  shareSlug: 'slug',
  hands: [],
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...over,
});

describe('putting two copies of a game back together', () => {
  it('keeps a hand only one device saw', () => {
    const local = game({ hands: [hand('h1', 0)], updatedAt: 'T2' });
    const remote = game({ hands: [hand('h2', 0)], updatedAt: 'T1' });

    expect(mergeGames(local, remote).hands.map((h) => h.id)).toEqual([
      'h1',
      'h2',
    ]);
  });

  it('never drops a hand, whichever side is newer', () => {
    // The asymmetric case: the newer copy is the one missing a hand. Taking
    // the newer copy wholesale would lose it, and every score after it.
    const local = game({ hands: [hand('h1', 0)], updatedAt: 'T9' });
    const remote = game({
      hands: [hand('h1', 0), hand('h2', 1)],
      updatedAt: 'T1',
    });

    expect(mergeGames(local, remote).hands).toHaveLength(2);
    expect(mergeGames(remote, local).hands).toHaveLength(2);
  });

  it('counts a hand both devices have exactly once', () => {
    const shared = hand('h1', 0);
    const merged = mergeGames(
      game({ hands: [shared], updatedAt: 'T1' }),
      game({ hands: [shared], updatedAt: 'T2' }),
    );
    expect(merged.hands).toHaveLength(1);
  });

  it('takes the later edit of a hand both devices changed', () => {
    const local = game({ hands: [hand('h1', 0, 4)], updatedAt: 'T2' });
    const remote = game({ hands: [hand('h1', 0, 9)], updatedAt: 'T1' });

    // A hand is a union, and only a win carries a faan.
    const faanOf = (g: GameRecord) => {
      const first = g.hands[0]!;
      return first.type === 'ceot_cung' || first.type === 'zi_mo'
        ? first.faan
        : null;
    };
    expect(faanOf(mergeGames(local, remote))).toBe(4);
    expect(faanOf(mergeGames(remote, local))).toBe(4);
  });

  it('takes the later edit of the players and the rules', () => {
    const local = game({ players: ['W', 'X', 'Y', 'Z'], updatedAt: 'T2' });
    const remote = game({ players: ['A', 'B', 'C', 'D'], updatedAt: 'T1' });

    expect(mergeGames(local, remote).players).toEqual(['W', 'X', 'Y', 'Z']);
    expect(mergeGames(remote, local).players).toEqual(['W', 'X', 'Y', 'Z']);
  });

  it('hands out seq again so the order has no gaps or repeats', () => {
    const local = game({ hands: [hand('h1', 0), hand('h3', 2)], updatedAt: 'T2' });
    const remote = game({ hands: [hand('h2', 0), hand('h4', 1)], updatedAt: 'T1' });

    expect(mergeGames(local, remote).hands.map((h) => h.seq)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('comes out the same whichever device syncs first', () => {
    const local = game({ hands: [hand('h1', 0), hand('h3', 1)], updatedAt: 'T2' });
    const remote = game({ hands: [hand('h2', 0), hand('h4', 1)], updatedAt: 'T1' });

    expect(mergeGames(local, remote).hands.map((h) => h.id)).toEqual(
      mergeGames(remote, local).hands.map((h) => h.id),
    );
  });

  it('is newer than either copy, so the next sync carries it', () => {
    const merged = mergeGames(
      game({ updatedAt: 'T2' }),
      game({ updatedAt: 'T7' }),
    );
    expect(merged.updatedAt).toBe('T7');
  });

  it('keeps the earlier creation time, which is when the game began', () => {
    const merged = mergeGames(
      game({ createdAt: 'T5', updatedAt: 'T9' }),
      game({ createdAt: 'T1', updatedAt: 'T2' }),
    );
    expect(merged.createdAt).toBe('T1');
  });

  it('merges an empty copy without inventing anything', () => {
    const local = game({ hands: [hand('h1', 0)], updatedAt: 'T2' });
    expect(mergeGames(local, game({ updatedAt: 'T1' })).hands).toHaveLength(1);
    expect(mergeGames(game({ updatedAt: 'T1' }), local).hands).toHaveLength(1);
  });
});

describe('telling whether a copy says anything new', () => {
  it('sees two identical copies as the same', () => {
    const a = game({ hands: [hand('h1', 0)] });
    expect(sameGame(a, game({ hands: [hand('h1', 0)] }))).toBe(true);
  });

  it('sees a changed faan, a new hand, and a newer edit', () => {
    const a = game({ hands: [hand('h1', 0, 3)] });
    expect(sameGame(a, game({ hands: [hand('h1', 0, 8)] }))).toBe(false);
    expect(sameGame(a, game({ hands: [hand('h1', 0), hand('h2', 1)] }))).toBe(
      false,
    );
    expect(sameGame(a, game({ hands: [hand('h1', 0)], updatedAt: 'T9' }))).toBe(
      false,
    );
  });
});
