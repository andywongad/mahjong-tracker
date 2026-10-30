import { describe, expect, it } from 'vitest';
import { playedGames, resumable } from '../resume';
import { SEED_GAME_ID } from '../seed';
import type { GameSummary } from '../standings';

const game = (over: Partial<GameSummary> = {}): GameSummary =>
  ({
    id: 'game-1',
    date: '2026-10-30',
    players: ['A', 'B', 'C', 'D'],
    scores: [0, 0, 0, 0],
    handCount: 3,
    isComplete: false,
    endedEarly: false,
    isFinished: false,
    shareSlug: null,
    baseUnit: 1,
    currency: 'HKD',
    ...over,
  }) as GameSummary;

describe('the game home offers to carry on with', () => {
  it('is the newest one', () => {
    const newest = game({ id: 'newest' });
    expect(resumable([newest, game({ id: 'older' })])?.id).toBe('newest');
  });

  it('is never the sample game the app seeds on first run', () => {
    // Offering to carry on with a game nobody has played would be untrue, and
    // it would be the first thing a newcomer reads.
    expect(resumable([game({ id: SEED_GAME_ID })])).toBeNull();
    expect(playedGames([game({ id: SEED_GAME_ID })])).toEqual([]);
  });

  it('skips past the sample to a game that was actually played', () => {
    const mine = game({ id: 'mine' });
    expect(resumable([game({ id: SEED_GAME_ID }), mine])?.id).toBe('mine');
  });

  it('still offers a game whose round is complete, because tables play on', () => {
    expect(resumable([game({ isComplete: true, isFinished: true })])).not.toBeNull();
  });

  it('does not offer a game that was settled up and ended', () => {
    expect(resumable([game({ endedEarly: true })])).toBeNull();
  });

  it('falls past an ended game to the one before it', () => {
    const earlier = game({ id: 'earlier' });
    expect(
      resumable([game({ id: 'ended', endedEarly: true }), earlier])?.id,
    ).toBe('earlier');
  });

  it('offers nothing at all on a first run', () => {
    expect(resumable([])).toBeNull();
  });
});
