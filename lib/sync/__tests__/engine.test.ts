import { describe, expect, it, vi } from 'vitest';
import { syncOnce, type LocalGames, type RemoteGames } from '../engine';
import { SEED_GAME_ID } from '@/lib/game/seed';
import { OUR_TABLE } from '@/lib/rules/types';
import type { GameRecord, HandRecord } from '@/lib/game/types';

const hand = (id: string, seq: number): HandRecord => ({
  id,
  seq,
  type: 'ceot_cung',
  winnerSeat: 0,
  discarderSeat: 1,
  faan: 3,
});

const game = (id: string, over: Partial<GameRecord> = {}): GameRecord => ({
  id,
  date: '2026-11-01',
  players: ['A', 'B', 'C', 'D'],
  rules: OUR_TABLE,
  shareSlug: `slug-${id}`,
  hands: [],
  createdAt: 'T0',
  updatedAt: 'T1',
  ...over,
});

function fakes(
  localGames: GameRecord[] = [],
  remoteGames: GameRecord[] = [],
  queued: { id: number; gameId: string; kind: 'game:upsert' | 'game:delete' }[] = [],
) {
  const locals = new Map(localGames.map((g) => [g.id, g]));
  const remotes = new Map(remoteGames.map((g) => [g.id, g]));
  let pending = [...queued];

  const local: LocalGames = {
    list: async () => [...locals.values()],
    get: async (id) => locals.get(id) ?? null,
    save: vi.fn(async (g: GameRecord) => {
      locals.set(g.id, g);
    }),
    pending: async () => pending,
    clearPending: async (upToId) => {
      pending = pending.filter((e) => e.id !== upToId);
    },
  };
  const remote: RemoteGames = {
    list: async () => [...remotes.values()],
    upsert: vi.fn(async (g: GameRecord) => {
      remotes.set(g.id, g);
    }),
    remove: vi.fn(async (id: string) => {
      remotes.delete(id);
    }),
  };
  return { local, remote, locals, remotes, left: () => pending };
}

describe('one pass of syncing', () => {
  it('claims the games already on the device, which is a first sign-in', async () => {
    const f = fakes([game('g1'), game('g2')], []);
    const report = await syncOnce(f.local, f.remote);

    expect([...f.remotes.keys()].sort()).toEqual(['g1', 'g2']);
    expect(report.pushed).toBe(2);
  });

  it('brings down a game this device has never seen', async () => {
    const f = fakes([], [game('g9')]);
    const report = await syncOnce(f.local, f.remote);

    expect(f.locals.has('g9')).toBe(true);
    expect(report.pulled).toBe(1);
  });

  it('never syncs the sample game the app seeds', async () => {
    // It is the same record on every device; an account should not collect it.
    const f = fakes([game(SEED_GAME_ID), game('mine')], []);
    await syncOnce(f.local, f.remote);

    expect([...f.remotes.keys()]).toEqual(['mine']);
  });

  it('merges a game both sides changed, and sends the result back', async () => {
    const f = fakes(
      [game('g1', { hands: [hand('h1', 0)], updatedAt: 'T5' })],
      [game('g1', { hands: [hand('h2', 0)], updatedAt: 'T3' })],
    );
    const report = await syncOnce(f.local, f.remote);

    expect(f.locals.get('g1')!.hands).toHaveLength(2);
    expect(f.remotes.get('g1')!.hands).toHaveLength(2);
    expect(report.merged).toBe(1);
  });

  it('leaves an unchanged game alone rather than rewriting it', async () => {
    const same = game('g1', { hands: [hand('h1', 0)] });
    const f = fakes([same], [structuredClone(same)]);
    await syncOnce(f.local, f.remote);

    expect(f.local.save).not.toHaveBeenCalled();
  });

  it('sends a delete before pulling, so the game does not come back', async () => {
    const f = fakes([], [game('gone')], [
      { id: 1, gameId: 'gone', kind: 'game:delete' },
    ]);
    await syncOnce(f.local, f.remote);

    expect(f.remote.remove).toHaveBeenCalledWith('gone');
    expect(f.locals.has('gone')).toBe(false);
  });

  it('keeps a change queued when the push fails, and stops there', async () => {
    const f = fakes([game('g1'), game('g2')], []);
    f.remote.upsert = vi.fn(async () => {
      throw new Error('offline');
    });
    const report = await syncOnce(
      { ...f.local, pending: async () => [
        { id: 1, gameId: 'g1', kind: 'game:upsert' as const },
        { id: 2, gameId: 'g2', kind: 'game:upsert' as const },
      ] },
      f.remote,
    );

    // Nothing is thrown away on a failure: it is still queued for next time.
    expect(report.pushed).toBe(0);
    expect(report.failed).toBeGreaterThan(0);
  });

  it('gives up quietly when the account cannot be reached at all', async () => {
    const f = fakes([game('g1')], []);
    f.remote.list = vi.fn(async () => {
      throw new Error('offline');
    });
    const report = await syncOnce(f.local, f.remote);

    expect(report.failed).toBeGreaterThan(0);
    // The device still has its game. Being offline is not a reason to lose one.
    expect(f.locals.has('g1')).toBe(true);
  });

  it('does nothing at all when both sides are empty', async () => {
    const f = fakes([], []);
    const report = await syncOnce(f.local, f.remote);
    expect(report).toEqual({ pushed: 0, pulled: 0, merged: 0, failed: 0 });
  });
});

describe('deleting the sample game', () => {
  /**
   * The sample is never pushed, so the account has nothing to delete — and
   * its id is not a uuid, so asking the account to delete it fails. A failed
   * push stays queued and stops the loop, which is right for a network blip
   * and fatal for a request that can never succeed: every later change, every
   * later delete included, waits behind it forever while the pull keeps
   * handing those games back.
   */
  it('never asks the account to delete a game it was never given', async () => {
    const f = fakes([], [], [
      { id: 1, gameId: SEED_GAME_ID, kind: 'game:delete' },
    ]);

    const report = await syncOnce(f.local, f.remote);

    expect(f.remote.remove).not.toHaveBeenCalled();
    expect(report.failed).toBe(0);
    expect(f.left()).toEqual([]);
  });

  it('does not wedge the deletes queued behind it', async () => {
    // The account holds a real game; this device has deleted the sample and
    // then that game, in that order.
    const f = fakes([], [game('g1')], [
      { id: 1, gameId: SEED_GAME_ID, kind: 'game:delete' },
      { id: 2, gameId: 'g1', kind: 'game:delete' },
    ]);
    // The real account rejects the sample's id outright: the column is a
    // uuid and "seed-aug-19-2026" is not one, so this never succeeds however
    // many times it is retried.
    const removing = f.remote.remove as unknown as ReturnType<typeof vi.fn>;
    const real = removing.getMockImplementation()!;
    removing.mockImplementation(async (id: string) => {
      if (id === SEED_GAME_ID) {
        throw new Error('invalid input syntax for type uuid');
      }
      return real(id);
    });

    await syncOnce(f.local, f.remote);

    expect(f.remote.remove).toHaveBeenCalledWith('g1');
    expect([...f.remotes.keys()]).toEqual([]);
    // And the pull did not hand it straight back.
    expect([...f.locals.keys()]).toEqual([]);
  });
});
