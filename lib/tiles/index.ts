/**
 * Just enough of a tile model to draw an example hand.
 *
 * Nothing here is used for scoring: the engine records faan, not tiles. This
 * exists so the glossary can show what a pattern looks like rather than only
 * describe it.
 */

export type Suit = 'characters' | 'dots' | 'bamboo' | 'honour' | 'bonus';

/** Honours in the order a set of tiles comes in: the four winds, then the three dragons. */
export type Honour =
  'east' | 'south' | 'west' | 'north' | 'red' | 'green' | 'white';

export interface Tile {
  suit: Suit;
  /** A flower or a season, which sits beside the hand rather than in it. */
  bonus?: string;
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
const BONUS_NAMES: Record<string, string> = {
  s1: 'Season 1, spring',
  s2: 'Season 2, summer',
  s3: 'Season 3, autumn',
  s4: 'Season 4, winter',
};

export function tileName(tile: Tile): string {
  if (tile.suit === 'bonus') return BONUS_NAMES[tile.bonus ?? ''] ?? 'Flower';
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
    bonus: '',
  };
  return `${tile.rank} ${suits[tile.suit]}`;
}

/** The whole hand as a sentence, for anyone who cannot see the drawing. */
export function handName(groups: Tile[][]): string {
  return groups.map((group) => group.map(tileName).join(', ')).join('; ');
}

/* ---------------------------------------------------------------------------
   Compact keys
   The hand scorer counts tiles, looks for runs and splits a hand into sets,
   all of which are far easier on a short string than on an object. "d1" is the
   one of dots, "wE" the east wind, "f1" the first flower.
--------------------------------------------------------------------------- */

export type SuitLetter = 'd' | 'b' | 'c';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SuitKey = `${SuitLetter}${Rank}`;
export type HonourKey = 'wE' | 'wS' | 'wW' | 'wN' | 'rR' | 'rG' | 'rW';
/** Flowers and seasons sit beside the hand and are never part of a set. */
export type BonusKey = 's1' | 's2' | 's3' | 's4';
/** Anything that can be in the hand proper. */
export type TileKey = SuitKey | HonourKey;

export const SUIT_KEYS: SuitLetter[] = ['d', 'b', 'c'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const HONOUR_KEYS: HonourKey[] = [
  'wE',
  'wS',
  'wW',
  'wN',
  'rR',
  'rG',
  'rW',
];
export const BONUS_KEYS: BonusKey[] = ['s1', 's2', 's3', 's4'];

const SUIT_OF: Record<SuitLetter, Suit> = {
  d: 'dots',
  b: 'bamboo',
  c: 'characters',
};

const HONOUR_OF: Record<HonourKey, Honour> = {
  wE: 'east',
  wS: 'south',
  wW: 'west',
  wN: 'north',
  rR: 'red',
  rG: 'green',
  rW: 'white',
};

export function isSuitKey(key: string): key is SuitKey {
  return SUIT_KEYS.includes(key[0] as SuitLetter) && /^[dbc][1-9]$/.test(key);
}

export function isHonourKey(key: string): key is HonourKey {
  return (HONOUR_KEYS as string[]).includes(key);
}

export function isBonusKey(key: string): key is BonusKey {
  return (BONUS_KEYS as string[]).includes(key);
}

/** The rank of a numbered tile, or null for an honour. */
export function rankOf(key: TileKey): Rank | null {
  return isSuitKey(key) ? (Number(key.slice(1)) as Rank) : null;
}

export function suitOf(key: TileKey): SuitLetter | null {
  return isSuitKey(key) ? (key[0] as SuitLetter) : null;
}

/** A key as the drawable tile the rest of the app already understands. */
export function tileOf(key: TileKey | BonusKey): Tile {
  if (isSuitKey(key)) {
    return { suit: SUIT_OF[key[0] as SuitLetter], rank: Number(key.slice(1)) };
  }
  if (isHonourKey(key)) return { suit: 'honour', honour: HONOUR_OF[key] };
  return { suit: 'bonus', bonus: key as BonusKey };
}

/**
 * Sorting order for the tray and for anywhere a hand is shown tidied. The hand
 * itself is never sorted: tiles stay where they were tapped.
 */
export function orderOf(key: TileKey | BonusKey): number {
  if (isSuitKey(key)) {
    return { d: 0, b: 10, c: 20 }[key[0] as SuitLetter] + Number(key.slice(1));
  }
  const rest: Record<string, number> = {
    wE: 30,
    wS: 31,
    wW: 32,
    wN: 33,
    rR: 34,
    rG: 35,
    rW: 36,
    f1: 40,
    f2: 41,
    f3: 42,
    f4: 43,
    s1: 44,
    s2: 45,
    s3: 46,
    s4: 47,
  };
  return rest[key] ?? 99;
}

/** How many of each tile a hand holds. */
export function countTiles(tiles: readonly TileKey[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of tiles) counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}

const SUIT_LETTER: Partial<Record<Suit, SuitLetter>> = {
  dots: 'd',
  bamboo: 'b',
  characters: 'c',
};

const HONOUR_KEY: Record<Honour, HonourKey> = {
  east: 'wE',
  south: 'wS',
  west: 'wW',
  north: 'wN',
  red: 'rR',
  green: 'rG',
  white: 'rW',
};

/** The key for a tile, which is also the name of its drawing in the sprite. */
export function keyOf(tile: Tile): TileKey | BonusKey | null {
  if (tile.suit === 'bonus') return (tile.bonus as BonusKey) ?? null;
  if (tile.suit === 'honour') {
    return tile.honour ? HONOUR_KEY[tile.honour] : null;
  }
  const letter = SUIT_LETTER[tile.suit];
  return letter && tile.rank ? (`${letter}${tile.rank}` as TileKey) : null;
}
