'use client';

import { useMemo, useState } from 'react';
import {
  BONUS_KEYS,
  HONOUR_KEYS,
  RANKS,
  countTiles,
  isSuitKey,
  tileName,
  tileOf,
  type BonusKey,
  type SuitLetter,
  type TileKey,
} from '@/lib/tiles';
import { targetSize, tilesOfSet, type Reading } from '@/lib/tiles/solver';
import type { ScoredHand } from '@/lib/patterns/detect';
import { Tile } from '@/components/ui/Tile';

/** The tray's tabs: the three suits, then honours, then flowers. */
const TRAYS: { id: string; zh: string; en: string }[] = [
  { id: 'd', zh: '筒', en: 'Dots' },
  { id: 'b', zh: '索', en: 'Bamboo' },
  { id: 'c', zh: '萬', en: 'Characters' },
  { id: 'h', zh: '字', en: 'Honours' },
  { id: 'f', zh: '花', en: 'Flowers' },
];

const TRAY_NOTE: Record<string, string> = {
  d: 'Dots (筒). Tap a tile once for each copy in the hand.',
  b: 'Bamboo (索). Tap a tile once for each copy in the hand.',
  c: 'Characters (萬). Tap a tile once for each copy in the hand.',
  h: 'Winds and dragons. Tap once for each copy in the hand.',
  f: 'Flowers and seasons sit beside the hand, not in it.',
};

const SUIT_NAME: Record<string, string> = {
  d: 'Dots',
  b: 'Bamboo',
  c: 'Characters',
};

const KIND_NAME: Record<string, string> = {
  chow: 'Run',
  pung: 'Pung',
  kong: 'Kong',
  pair: 'Pair',
};

/** How a split reads out loud, for the chips under the hand. */
function describeReading(reading: Reading): { kind: string; what: string }[] {
  return [...reading.sets, reading.pair].map((set) => {
    if (set.kind === 'chow') {
      const low = Number(set.key.slice(1));
      return {
        kind: KIND_NAME.chow,
        what: `${low}-${low + 1}-${low + 2} ${SUIT_NAME[set.key[0]]}`,
      };
    }
    return { kind: KIND_NAME[set.kind], what: tileName(tileOf(set.key)) };
  });
}

/**
 * Work the hand out from the tiles.
 *
 * Tiles stay in the order they were tapped, because a player reading their own
 * hand back off the table needs to find the one they meant, not the one a
 * sort put there. The sets are worked out without ever moving them.
 */
export function TapTheTiles({
  tiles,
  flowers,
  scored,
  ownFlowerNumber,
  onTiles,
  onFlowers,
}: {
  tiles: TileKey[];
  flowers: BonusKey[];
  scored: ScoredHand;
  /** The winner's seat number, which is the flower that counts as theirs. */
  ownFlowerNumber: number;
  onTiles: (tiles: TileKey[]) => void;
  onFlowers: (flowers: BonusKey[]) => void;
}) {
  const [tray, setTray] = useState('d');

  const counts = useMemo(() => countTiles(tiles), [tiles]);
  const target = targetSize(tiles);
  const left = target - tiles.length;
  const quads = Object.values(counts).filter((count) => count === 4).length;

  const keys: (TileKey | BonusKey)[] =
    tray === 'h'
      ? HONOUR_KEYS
      : tray === 'f'
        ? BONUS_KEYS
        : RANKS.map((rank) => `${tray as SuitLetter}${rank}` as TileKey);

  const readAs = scored.reading
    ? describeReading(scored.reading)
    : scored.complete
      ? [{ kind: 'Thirteen Orphans', what: 'every 1, 9 and honour' }]
      : [];

  let message: string;
  let tone = 'var(--muted)';
  if (tiles.length === 0) {
    message = 'Tap the tiles in the winning hand. Tap one here to take it out.';
  } else if (scored.complete) {
    message =
      'A complete hand: four sets and a pair. Tap any tile to remove it.';
    tone = 'var(--gain)';
  } else if (left > 0) {
    message = 'Keep going. Tap a tile here to take it back out.';
  } else {
    message =
      'These tiles do not make four sets and a pair. Check for a missing, extra or wrong tile.';
    tone = 'var(--loss)';
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">The winning hand</h3>
          <span className="tnum text-xs" style={{ color: 'var(--muted)' }}>
            {tiles.length} of {target} tiles
            {quads > 0 && ' · a kong adds one'}
          </span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--line)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (tiles.length / target) * 100)}%`,
              background: scored.complete ? 'var(--gain)' : 'var(--tile-back)',
            }}
          />
        </div>

        <div
          className="flex min-h-[3.5rem] flex-wrap items-center gap-1 rounded-xl px-2 py-2"
          style={{ background: 'var(--felt)' }}
        >
          {tiles.map((key, index) => (
            <button
              key={`${key}-${index}`}
              type="button"
              aria-label={`Remove ${tileName(tileOf(key))}`}
              onClick={() =>
                onTiles(tiles.filter((_, position) => position !== index))
              }
            >
              <Tile tile={tileOf(key)} size={30} />
            </button>
          ))}
          {tiles.length === 0 && (
            <span
              className="px-1 text-xs"
              style={{ color: 'var(--muted-on-felt)' }}
            >
              No tiles yet
            </span>
          )}
        </div>

        {flowers.length > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--muted)' }}
            >
              Flowers
            </span>
            {flowers.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={`Remove ${tileName(tileOf(key))}`}
                onClick={() =>
                  onFlowers(flowers.filter((item) => item !== key))
                }
              >
                <Tile tile={tileOf(key)} size={26} />
              </button>
            ))}
          </div>
        )}

        {readAs.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {readAs.map((chip, index) => (
              <li
                key={index}
                className="rounded-md px-2 py-1 text-[0.7rem]"
                style={{
                  background: 'var(--line)',
                  color: 'var(--ink)',
                }}
              >
                <span className="font-semibold">{chip.kind}</span> {chip.what}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs" style={{ color: tone }}>
          {message}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div
          className="grid grid-cols-5 gap-1"
          style={{ borderBottom: '1px solid var(--line-strong)' }}
          role="tablist"
          aria-label="Which tiles to show"
        >
          {TRAYS.map((item) => {
            const selected = tray === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTray(item.id)}
                className="flex flex-col items-center gap-0.5 py-2 text-xs"
                style={{
                  color: selected ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: selected ? 600 : 500,
                  boxShadow: selected
                    ? 'inset 0 -3px 0 var(--accent)'
                    : undefined,
                }}
              >
                <span
                  lang="zh-Hant"
                  className="hanzi text-base leading-none"
                  aria-hidden="true"
                >
                  {item.zh}
                </span>
                {item.en}
              </button>
            );
          })}
        </div>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {TRAY_NOTE[tray]}
          {tray === 'f' && ` Number ${ownFlowerNumber} is this player's own.`}
        </p>

        <div className="grid grid-cols-5 gap-2">
          {keys.map((key) => {
            const bonus = tray === 'f';
            const held = bonus
              ? flowers.includes(key as BonusKey)
                ? 1
                : 0
              : (counts[key] ?? 0);
            // A fourth copy is a kong, which is allowed and raises the target.
            const quadsAfter = quads + (held === 3 ? 1 : 0);
            const disabled = bonus
              ? false
              : held >= 4 || tiles.length + 1 > 14 + quadsAfter;

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-label={`Add ${tileName(tileOf(key))}${
                  held > 0 ? `, ${held} already` : ''
                }`}
                onClick={() =>
                  bonus
                    ? onFlowers(
                        held
                          ? flowers.filter((item) => item !== key)
                          : [...flowers, key as BonusKey],
                      )
                    : onTiles([...tiles, key as TileKey])
                }
                className="tile-pressable flex items-center justify-center rounded-lg py-1"
                style={{
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? 'not-allowed' : undefined,
                }}
              >
                {/* The marks hang off the tile itself, not off the cell it
                  sits in, so they stay with it at any width. */}
                <span className="relative inline-flex">
                  {isSuitKey(key as string) && (
                    <span
                      aria-hidden="true"
                      className="tnum absolute top-1 left-1.5 z-10 text-[0.6rem] leading-none"
                      style={{ color: 'var(--muted)' }}
                    >
                      {(key as string).slice(1)}
                    </span>
                  )}
                  {held > 0 && (
                    <span
                      aria-hidden="true"
                      className="tnum absolute -top-1 -right-1.5 z-10 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold"
                      style={{ background: 'var(--tile-back)', color: '#fff' }}
                    >
                      {bonus ? '✓' : `×${held}`}
                    </span>
                  )}
                  <span
                    style={{
                      outline:
                        held > 0 ? '2px solid var(--tile-back)' : undefined,
                      outlineOffset: 1,
                      borderRadius: 6,
                      display: 'inline-flex',
                    }}
                  >
                    <Tile tile={tileOf(key)} size={46} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { tilesOfSet };
