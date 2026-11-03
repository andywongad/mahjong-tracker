import { describe, expect, it } from 'vitest';
import { stats, type GameRules, type Hand } from '@/lib/scoring';
import { AUG_19_2026_GAME } from '@/lib/scoring/fixtures/aug-19-2026';
import { OUR_TABLE } from '@/lib/rules/types';
import { highlights } from '../highlights';

/**
 * What these test is the editing, not the arithmetic: the numbers are the
 * stats pass's, already covered. The judgement calls are which facts earn a
 * sentence and which are padding, so that is what is pinned here.
 */

const ids = (game: GameRules) => highlights(stats(game)).map((h) => h.id);
const textOf = (game: GameRules, id: string) =>
  highlights(stats(game)).find((h) => h.id === id)?.text;

/** A game of whatever hands are given, played by the same four. */
function gameOf(hands: Hand[]): GameRules {
  return {
    players: ['Ann', 'Bo', 'Cal', 'Di'],
    rules: OUR_TABLE,
    hands,
  } as unknown as GameRules;
}

const win = (winnerSeat: number, discarderSeat: number, faan = 4): Hand =>
  ({ type: 'ceot_cung', winnerSeat, discarderSeat, faan }) as Hand;
const selfDraw = (winnerSeat: number, faan = 4): Hand =>
  ({ type: 'zi_mo', winnerSeat, faan }) as Hand;
const draw = (): Hand => ({ type: 'draw' }) as Hand;

describe('when there is nothing worth saying', () => {
  it('says nothing about a game with no hands', () => {
    expect(highlights(stats(gameOf([])))).toEqual([]);
  });

  it('will not call two hands in a row a run', () => {
    // Ann wins twice running, which happens to everybody.
    const game = gameOf([win(0, 1), win(0, 2), win(3, 1), win(2, 1)]);
    expect(ids(game)).not.toContain('streak');
  });

  it('will not read a shape into a game too short to have one', () => {
    // Ann is well up and gives it back, but over four hands that is noise.
    const game = gameOf([win(0, 1, 13), win(1, 0, 13), win(2, 0, 13), win(3, 0, 13)]);
    expect(ids(game)).not.toContain('gave-back');
    expect(ids(game)).not.toContain('comeback');
  });

  it('will not call one feed a pattern', () => {
    const game = gameOf([win(0, 1), win(0, 2), win(3, 2), draw()]);
    expect(ids(game)).not.toContain('feeding');
  });

  it('keeps a short game to what is actually true of it', () => {
    const found = highlights(stats(gameOf([win(0, 1, 7), win(2, 3)])));
    // A result and a biggest hand, and nothing invented on top.
    expect(found.map((h) => h.id).sort()).toEqual(['biggest-hand', 'result']);
  });
});

describe('what it picks out', () => {
  it('leads with the result', () => {
    const found = highlights(stats(AUG_19_2026_GAME));
    expect(found[0].id).toBe('result');
    expect(found[0].text).toMatch(/Player C took the night on \+64/);
  });

  it('says who was level rather than inventing a winner', () => {
    const game = gameOf([win(0, 1), win(2, 3)]);
    expect(textOf(game, 'tied')).toMatch(/finished level/);
  });

  it('calls three in a row a run', () => {
    const game = gameOf([
      win(0, 1), win(0, 2), win(0, 3), win(1, 2), win(2, 3), draw(),
    ]);
    expect(textOf(game, 'streak')).toBe('Ann won 3 hands in a row.');
  });

  it('notices who kept feeding whom', () => {
    const game = gameOf([win(0, 1), win(0, 1), win(0, 1), win(2, 3), draw()]);
    expect(textOf(game, 'feeding')).toMatch(/^Bo fed Ann 3 times/);
  });

  it('notices a night given back, with the hand it turned on', () => {
    // Ann goes well clear, then loses it over the rest of a long game.
    const game = gameOf([
      selfDraw(0, 13), selfDraw(0, 13), selfDraw(0, 13),
      win(1, 0, 13), win(2, 0, 13), win(3, 0, 13), win(1, 0, 13),
      win(2, 0, 13), win(3, 0, 13), win(1, 0, 13), win(2, 0, 13),
    ]);
    expect(textOf(game, 'gave-back')).toMatch(/^Ann was \+\d+ after hand 3/);
  });

  it('counts a clean sheet only once the game is long enough to mean it', () => {
    // Three of them trade hands between themselves; Di sits out of the
    // trouble entirely and never discards a winning tile.
    const rotation = [win(0, 1), win(1, 2), win(2, 0)];
    const short = gameOf(rotation);
    expect(ids(short)).not.toContain('never-dealt-in');

    const long = gameOf(
      Array.from({ length: 15 }, (_, index) => rotation[index % 3]),
    );
    expect(textOf(long, 'never-dealt-in')).toBe('Di never dealt in.');
  });

  it('reports a false win, which a table does not forget', () => {
    const game = gameOf([
      win(0, 1),
      { type: 'zaa_wu', offenderSeat: 2 } as Hand,
      win(3, 1),
    ]);
    expect(textOf(game, 'false-win')).toBe('Cal called a false win.');
  });
});

describe('how much it says', () => {
  it('stops at four, so it stays a story rather than a list', () => {
    expect(highlights(stats(AUG_19_2026_GAME))).toHaveLength(4);
  });

  it('never says the same kind of thing twice', () => {
    const found = highlights(stats(AUG_19_2026_GAME)).map((h) => h.id);
    expect(new Set(found).size).toBe(found.length);
  });

  it('orders by how much each is worth saying', () => {
    const weights = highlights(stats(AUG_19_2026_GAME)).map((h) => h.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });
});
