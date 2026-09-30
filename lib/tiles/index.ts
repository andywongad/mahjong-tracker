/**
 * Just enough of a tile model to draw an example hand.
 *
 * Nothing here is used for scoring: the engine records faan, not tiles. This
 * exists so the glossary can show what a pattern looks like rather than only
 * describe it.
 */

export type Suit = 'characters' | 'dots' | 'bamboo' | 'honour';

/** Honours in the order a set of tiles comes in: the four winds, then the three dragons. */
export type Honour =
  'east' | 'south' | 'west' | 'north' | 'red' | 'green' | 'white';

export interface Tile {
  suit: Suit;
  /** 1 to 9 for the three numbered suits. */
  rank?: number;
  honour?: Honour;
  /** The tile that completed the hand, drawn slightly apart. */
  winning?: boolean;
}

const SUIT_LETTERS: Record<string, Suit> = {
  m: 'characters',
  p: 'dots',
  s: 'bamboo',
};

const HONOUR_LETTERS: Record<string, Honour> = {
  E: 'east',
  S: 'south',
  W: 'west',
  N: 'north',
  C: 'red',
  F: 'green',
  P: 'white',
};

/**
 * Parse the shorthand every mahjong table writes on the back of an envelope.
 *
 * Numbers followed by a suit letter ("123m", "55p"), honours as their own
 * letters ("EEE", "CC"), groups separated by spaces, and a group prefixed with
 * "+" is the tile that won the hand.
 *
 *   parse('123m 456p 789s EE +5s')
 */
export function parseHand(notation: string): Tile[][] {
  return notation
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((group) => parseGroup(group));
}

function parseGroup(group: string): Tile[] {
  const winning = group.startsWith('+');
  const body = winning ? group.slice(1) : group;
  const tiles: Tile[] = [];

  const suit = SUIT_LETTERS[body[body.length - 1]];
  if (suit) {
    for (const character of body.slice(0, -1)) {
      const rank = Number(character);
      if (!Number.isInteger(rank) || rank < 1 || rank > 9) {
        throw new Error(`Not a rank: ${character} in ${group}`);
      }
      tiles.push({ suit, rank, winning });
    }
    return tiles;
  }

  for (const character of body) {
    const honour = HONOUR_LETTERS[character];
    if (!honour) throw new Error(`Not a tile: ${character} in ${group}`);
    tiles.push({ suit: 'honour', honour, winning });
  }
  return tiles;
}

/** A tile's name, so a hand can be read aloud as well as looked at. */
export function tileName(tile: Tile): string {
  if (tile.suit === 'honour') {
    const names: Record<Honour, string> = {
      east: 'East wind',
      south: 'South wind',
      west: 'West wind',
      north: 'North wind',
      red: 'Red dragon',
      green: 'Green dragon',
      white: 'White dragon',
    };
    return names[tile.honour!];
  }
  const suits: Record<Suit, string> = {
    characters: 'characters',
    dots: 'dots',
    bamboo: 'bamboo',
    honour: '',
  };
  return `${tile.rank} ${suits[tile.suit]}`;
}

/** The whole hand as a sentence, for anyone who cannot see the drawing. */
export function handName(groups: Tile[][]): string {
  return groups.map((group) => group.map(tileName).join(', ')).join('; ');
}
