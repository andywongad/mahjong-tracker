import { describe, expect, it } from 'vitest';
import { scoreHand, type HandContext } from '../detect';
import { HK_STANDARD, OUR_TABLE } from '@/lib/rules/types';
import type { TileKey } from '@/lib/tiles';

const BASE: HandContext = {
  seatWind: 'south',
  roundWind: 'east',
  seatIndex: 1,
  flowers: [],
  selfDraw: false,
};

const ctx = (over: Partial<HandContext> = {}): HandContext => ({
  ...BASE,
  ...over,
});

const ids = (
  tiles: TileKey[],
  over?: Partial<HandContext>,
  rules = OUR_TABLE,
) => scoreHand(tiles, ctx(over), rules).patterns.map((p) => p.id);

describe('naming the patterns in a finished hand', () => {
  it('scores the prototype’s example hand', () => {
    const tiles: TileKey[] = [
      'rG',
      'c9',
      'c4',
      'rG',
      'c2',
      'c6',
      'c5',
      'c2',
      'c7',
      'rG',
      'c6',
      'c2',
      'c8',
      'c9',
    ];
    const scored = scoreHand(tiles, ctx(), OUR_TABLE);
    expect(scored.complete).toBe(true);
    // One suit plus a dragon, a dragon pung, and no flowers.
    expect(scored.patterns.map((p) => p.id).sort()).toEqual([
      'dragon_triplet',
      'mixed_one_suit',
      'no_flowers',
    ]);
    // 3 + 1 + 1 under our table's catalog.
    expect(scored.total.faan).toBe(5);
  });

  it('keeps the better of two ways to read the same tiles', () => {
    // Four pungs of dots and a pair, or three 1-2-3 runs with a pung left
    // over. Only the first is All Triplets, so only the first is three faan.
    const tiles: TileKey[] = [
      'd1',
      'd1',
      'd1',
      'd2',
      'd2',
      'd2',
      'd3',
      'd3',
      'd3',
      'd4',
      'd4',
      'd4',
      'c5',
      'c5',
    ];
    const scored = scoreHand(tiles, ctx(), OUR_TABLE);
    const found = scored.patterns.map((p) => p.id);

    expect(found).toContain('all_triplets');
    expect(found).not.toContain('all_sequences');
    // 3 for the triplets and 1 for no flowers; the runs reading is worth 1.
    expect(scored.total.faan).toBe(4);
  });

  it('counts Small Three Dragons as five, with the pungs inside it not scoring again', () => {
    const tiles: TileKey[] = [
      'rR',
      'rR',
      'rR',
      'rG',
      'rG',
      'rG',
      'rW',
      'rW',
      'd1',
      'd2',
      'd3',
      'b7',
      'b8',
      'b9',
    ];
    const scored = scoreHand(tiles, ctx(), OUR_TABLE);
    const found = scored.patterns.map((p) => p.id);
    expect(found).toContain('small_three_dragons');
    expect(found).not.toContain('dragon_triplet');
    // 5 for the dragons plus 1 for no flowers, and nothing for the two pungs.
    expect(scored.total.faan).toBe(6);
  });

  it('counts three dragon pungs as the limit hand instead', () => {
    const tiles: TileKey[] = [
      'rR',
      'rR',
      'rR',
      'rG',
      'rG',
      'rG',
      'rW',
      'rW',
      'rW',
      'd1',
      'd2',
      'd3',
      'c5',
      'c5',
    ];
    const scored = scoreHand(tiles, ctx(), OUR_TABLE);
    expect(scored.patterns.map((p) => p.id)).toContain('big_three_dragons');
    expect(scored.total.isLimit).toBe(true);
  });

  it('names a seat wind and a round wind only when they are the player’s', () => {
    const tiles: TileKey[] = [
      'wS',
      'wS',
      'wS',
      'wE',
      'wE',
      'wE',
      'd1',
      'd2',
      'd3',
      'b4',
      'b5',
      'b6',
      'c9',
      'c9',
    ];
    // Sitting South in the East round: both pungs count.
    expect(ids(tiles)).toEqual(
      expect.arrayContaining(['seat_wind', 'round_wind']),
    );
    // Sitting West in a North round: neither does.
    const other = ids(tiles, { seatWind: 'west', roundWind: 'north' });
    expect(other).not.toContain('seat_wind');
    expect(other).not.toContain('round_wind');
  });

  it('takes the self draw bonus from the rules, not from a number here', () => {
    const tiles: TileKey[] = [
      'd1',
      'd2',
      'd3',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
      'd9',
      'b1',
      'b2',
      'b3',
      'c5',
      'c5',
    ];
    // Our table pays nothing for a self draw; Hong Kong standard pays one.
    const ours = scoreHand(tiles, ctx({ selfDraw: true }), OUR_TABLE);
    const hk = scoreHand(tiles, ctx({ selfDraw: true }), HK_STANDARD);
    expect(hk.total.raw - ours.total.raw).toBe(HK_STANDARD.selfDrawBonusFaan);
  });

  it('counts a flower only when its number is the player’s seat', () => {
    const tiles: TileKey[] = [
      'd1',
      'd2',
      'd3',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
      'd9',
      'b1',
      'b2',
      'b3',
      'c5',
      'c5',
    ];
    // Seat 1 is South, so the number two tile is theirs and three is not.
    expect(ids(tiles, { flowers: ['s2'] })).toContain('own_flower');
    expect(ids(tiles, { flowers: ['s3'] })).not.toContain('own_flower');
    // Any flower at all ends the no flowers bonus.
    expect(ids(tiles, { flowers: ['s3'] })).not.toContain('no_flowers');
    expect(ids(tiles)).toContain('no_flowers');
  });

  it('reads thirteen orphans without needing any sets', () => {
    const tiles: TileKey[] = [
      'd1',
      'd9',
      'b1',
      'b9',
      'c1',
      'c9',
      'wE',
      'wS',
      'wW',
      'wN',
      'rR',
      'rG',
      'rW',
      'rW',
    ];
    const scored = scoreHand(tiles, ctx(), OUR_TABLE);
    expect(scored.complete).toBe(true);
    expect(scored.reading).toBeNull();
    expect(scored.patterns.map((p) => p.id)).toContain('thirteen_orphans');
    expect(scored.total.isLimit).toBe(true);
  });

  it('says a hand is unfinished rather than guessing at it', () => {
    const tiles: TileKey[] = [
      'd1',
      'd2',
      'd4',
      'd5',
      'd7',
      'd8',
      'b1',
      'b2',
      'b4',
      'b5',
      'b7',
      'b8',
      'c1',
      'c3',
    ];
    expect(scoreHand(tiles, ctx(), OUR_TABLE).complete).toBe(false);
  });
});

describe('what a part finished hand already shows', () => {
  it('names a pung of dragons as soon as the third one lands', () => {
    expect(ids(['rG', 'rG', 'rG'] as TileKey[])).toContain('dragon_triplet');
    expect(ids(['rG', 'rG'] as TileKey[])).not.toContain('dragon_triplet');
  });

  it('waits for six tiles before calling a hand one suit', () => {
    const four: TileKey[] = ['d1', 'd2', 'd3', 'd4'];
    const six: TileKey[] = [...four, 'd5', 'd6'];
    expect(ids(four)).not.toContain('full_flush');
    expect(ids(six)).toContain('full_flush');
  });

  it('never promises no flowers before the hand is finished', () => {
    expect(ids(['d1', 'd2', 'd3'] as TileKey[])).not.toContain('no_flowers');
  });
});

describe('a hand nobody helped with', () => {
  const RUN_HAND: TileKey[] = [
    'd1',
    'd2',
    'd3',
    'd4',
    'd5',
    'd6',
    'd7',
    'd8',
    'd9',
    'b1',
    'b2',
    'b3',
    'c5',
    'c5',
  ];

  it('is its own pattern where the table plays it', () => {
    // Hong Kong standard carries the new six, so a concealed hand counts.
    const open = scoreHand(RUN_HAND, ctx(), HK_STANDARD);
    const shut = scoreHand(RUN_HAND, ctx({ concealed: true }), HK_STANDARD);
    expect(shut.patterns.map((p) => p.id)).toContain('concealed_hand');
    expect(shut.total.raw).toBe(open.total.raw + 1);
  });

  it('counts concealed and self drawn as one pattern, not two', () => {
    const both = scoreHand(
      RUN_HAND,
      ctx({ concealed: true, selfDraw: true }),
      HK_STANDARD,
    );
    const ids = both.patterns.map((p) => p.id);
    expect(ids).toContain('fully_concealed_self_draw');
    expect(ids).not.toContain('concealed_hand');
    expect(ids).not.toContain('self_drawn');
  });

  it('is worth nothing at a table that does not play it', () => {
    // Our table leaves the new six out, so the claim earns no faan.
    const open = scoreHand(RUN_HAND, ctx(), OUR_TABLE);
    const shut = scoreHand(RUN_HAND, ctx({ concealed: true }), OUR_TABLE);
    expect(shut.patterns.map((p) => p.id)).not.toContain('concealed_hand');
    expect(shut.total.raw).toBe(open.total.raw);
  });
});
