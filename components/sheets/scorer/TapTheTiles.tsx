'use client';

import { useMemo } from 'react';
import {
  BONUS_KEYS,
  HONOUR_KEYS,
  RANKS,
  SUIT_KEYS,
  countTiles,
  tileName,
  tileOf,
  type BonusKey,
  type TileKey,
} from '@/lib/tiles';
import { targetSize } from '@/lib/tiles/solver';
import type { ScoredHand } from '@/lib/patterns/detect';
import { Tile } from '@/components/ui/Tile';

/**
 * Every tile that can be in a hand, grouped the way a set is laid out.
 *
 * The groups carry no labels: a suit is quicker to recognise by its own tiles
 * than by a word naming it, and breaking the rows keeps them apart well
 * enough on its own.
 */
const TILE_GROUPS: TileKey[][] = [
  ...SUIT_KEYS.map((suit) => RANKS.map((rank) => `${suit}${rank}` as TileKey)),
  HONOUR_KEYS,
];

/**
 * The hand sits in a box of one fixed height, and the tiles stretch to fill
 * the width it has. A row that wrapped onto a second line part way through
 * being built moved everything under it, which is distracting when the thing
 * you are doing is tapping tiles one at a time.
 */
const HAND_BOX = 56;
/** A tile never grows past what its own proportions allow at that height. */
const MAX_TILE_W = Math.round((HAND_BOX - 6) * 0.72);

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
  const counts = useMemo(() => countTiles(tiles), [tiles]);
  const target = targetSize(tiles);
  const left = target - tiles.length;
  const quads = Object.values(counts).filter((count) => count === 4).length;

  let message: string;
  let tone = 'var(--muted)';
  if (tiles.length === 0) {
    message = 'Tap the tiles in the winning hand. Tap one here to take it out.';
  } else if (scored.complete && !scored.reading) {
    // The one winning hand with no sets in it at all.
    message = 'Thirteen Orphans: one of every 1, 9 and honour tile.';
    tone = 'var(--gain)';
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
          className="flex items-center gap-0.5 rounded-xl px-2"
          style={{ background: 'var(--felt)', height: HAND_BOX }}
        >
          {tiles.map((key, index) => (
            <button
              key={`${key}-${index}`}
              type="button"
              aria-label={`Remove ${tileName(tileOf(key))}`}
              onClick={() =>
                onTiles(tiles.filter((_, position) => position !== index))
              }
              className="min-w-0 flex-1"
              style={{ maxWidth: MAX_TILE_W }}
            >
              <Tile tile={tileOf(key)} block />
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

        <p className="text-xs" style={{ color: tone }}>
          {message}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Tap a tile once for each copy in the hand.
        </p>

        {/* The whole tray at once. Tabs hid two thirds of it behind a guess
          about which suit you were about to reach for, and a tile is far
          quicker to spot than a label naming its suit. */}
        {TILE_GROUPS.map((group) => (
          <TileGrid key={group[0]}>
            {group.map((key) => {
              const held = counts[key] ?? 0;
              // A fourth copy is a kong, allowed, and it raises the target.
              const quadsAfter = quads + (held === 3 ? 1 : 0);
              const disabled = held >= 4 || tiles.length + 1 > 14 + quadsAfter;
              return (
                <TrayTile
                  key={key}
                  tileKey={key}
                  held={held}
                  disabled={disabled}
                  onPick={() => onTiles([...tiles, key])}
                />
              );
            })}
          </TileGrid>
        ))}

        <div
          className="flex flex-col gap-2 pt-1"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Flowers and seasons sit beside the hand, not in it. Number{' '}
            {ownFlowerNumber} is this player&rsquo;s own.
          </p>
          <TileGrid>
            {BONUS_KEYS.map((key) => {
              const held = flowers.includes(key) ? 1 : 0;
              return (
                <TrayTile
                  key={key}
                  tileKey={key}
                  held={held}
                  bonus
                  onPick={() =>
                    onFlowers(
                      held
                        ? flowers.filter((item) => item !== key)
                        : [...flowers, key],
                    )
                  }
                />
              );
            })}
          </TileGrid>
        </div>
      </section>
    </div>
  );
}

/**
 * As many tiles across as will fit, at the size they are.
 *
 * The track is barely wider than a tile so a whole suit of nine lands on one
 * row even on a 390px phone, which is the width that decides this: a suit
 * split across two rows is harder to count along than one that is not.
 */
function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(2.25rem, 1fr))',
      }}
    >
      {children}
    </div>
  );
}

/** One tile in the tray, with how many of it are already in the hand. */
function TrayTile({
  tileKey,
  held,
  disabled = false,
  bonus = false,
  onPick,
}: {
  tileKey: TileKey | BonusKey;
  held: number;
  disabled?: boolean;
  bonus?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Add ${tileName(tileOf(tileKey))}${
        held > 0 ? `, ${held} already` : ''
      }`}
      onClick={onPick}
      className="tile-pressable flex items-center justify-center rounded-lg py-1"
      style={{
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : undefined,
      }}
    >
      {/* The count hangs off the tile itself, not off the cell it sits in, so
        it stays with it at any width. The number in the corner is part of the
        drawing, so nothing is added for it. */}
      <span className="relative inline-flex">
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
            outline: held > 0 ? '2px solid var(--tile-back)' : undefined,
            outlineOffset: 1,
            borderRadius: 6,
            display: 'inline-flex',
          }}
        >
          <Tile tile={tileOf(tileKey)} size={46} />
        </span>
      </span>
    </button>
  );
}
