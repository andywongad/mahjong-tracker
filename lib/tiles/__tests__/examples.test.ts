import { describe, expect, it } from 'vitest';
import { PATTERNS } from '@/lib/patterns/catalog';
import { PATTERN_EXAMPLES } from '@/lib/patterns/examples';
import { parseHand, type Tile } from '..';

const flat = (notation: string): Tile[] => parseHand(notation).flat();

const key = (tile: Tile) =>
  tile.suit === 'honour' ? `z${tile.honour}` : `${tile.suit}${tile.rank}`;

describe('parsing tile shorthand', () => {
  it('reads suits, honours and the winning tile', () => {
    const groups = parseHand('123m 55p EE +7s');
    expect(groups.map((g) => g.length)).toEqual([3, 2, 2, 1]);
    expect(groups[0][0]).toMatchObject({ suit: 'characters', rank: 1 });
    expect(groups[1][0]).toMatchObject({ suit: 'dots', rank: 5 });
    expect(groups[2][0]).toMatchObject({ suit: 'honour', honour: 'east' });
    expect(groups[3][0]).toMatchObject({
      suit: 'bamboo',
      rank: 7,
      winning: true,
    });
  });

  it('refuses a tile that does not exist', () => {
    expect(() => parseHand('0m')).toThrow();
    expect(() => parseHand('12x')).toThrow();
  });
});

describe('the example hands', () => {
  const entries = Object.entries(PATTERN_EXAMPLES);

  it('only names patterns that exist', () => {
    const ids = new Set(PATTERNS.map((pattern) => pattern.id));
    for (const [id] of entries) expect(ids.has(id), id).toBe(true);
  });

  it('is fourteen tiles every time', () => {
    for (const [id, example] of entries) {
      expect(flat(example.hand).length, id).toBe(14);
    }
  });

  it('never uses a fifth copy of a tile', () => {
    for (const [id, example] of entries) {
      const counts = new Map<string, number>();
      for (const tile of flat(example.hand)) {
        const k = key(tile);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      for (const [k, count] of counts) {
        expect(count, `${id}: ${k}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('shows what each pattern claims to show', () => {
    const tiles = (id: string) => flat(PATTERN_EXAMPLES[id].hand);

    // No terminals and no honours.
    for (const tile of tiles('all_simples')) {
      expect(tile.suit).not.toBe('honour');
      expect(tile.rank).toBeGreaterThan(1);
      expect(tile.rank).toBeLessThan(9);
    }

    // One numbered suit missing entirely.
    const suits = new Set(
      tiles('lacking_a_suit')
        .filter((tile) => tile.suit !== 'honour')
        .map((tile) => tile.suit),
    );
    expect(suits.size).toBeLessThanOrEqual(2);

    // Honours and nothing else.
    for (const tile of tiles('all_honors')) expect(tile.suit).toBe('honour');

    // One suit, no honours.
    const flush = new Set(tiles('full_flush').map((tile) => tile.suit));
    expect(flush).toEqual(new Set(['dots']));

    // Both other dragon triplets, plus a pair of the third.
    const dragons = tiles('small_three_dragons').filter(
      (tile) => tile.honour && ['red', 'green', 'white'].includes(tile.honour),
    );
    expect(dragons.length).toBe(8);

    // Every terminal and every honour, one of them paired.
    const orphans = new Set(tiles('thirteen_orphans').map(key));
    expect(orphans.size).toBe(13);
  });

  it('gives every example something to look at', () => {
    for (const [id, example] of entries) {
      expect(example.note.trim(), id).not.toBe('');
    }
  });
});
