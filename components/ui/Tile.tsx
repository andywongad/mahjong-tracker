'use client';

import {
  keyOf,
  parseHand,
  tileName,
  handName,
  type Tile as TileModel,
} from '@/lib/tiles';

/*
 * Tiles come from public/tiles.svg, a sprite of the drawn set built by
 * scripts/build-tile-sprite.mjs. <TileSprite> puts it in the page once and
 * every tile below is one <use> of a shape in it.
 */

const FACE = '#fcfcf7';
const EDGE = '#00000026';

/** The drawing is 900 by 1211, so a tile is a shade under three quarters as wide. */
const ASPECT = 900 / 1211;

/**
 * One tile, drawn from the sprite.
 *
 * The drawings carry their own frame and corner number, so nothing is added
 * around them here. The face behind is painted by this element rather than by
 * the artwork, which is what keeps a tile cream in dark mode: a tile is an
 * object, not a surface, and a dark mahjong tile would be a different object.
 */
export function Tile({
  tile,
  size = 34,
  block = false,
}: {
  tile: TileModel;
  size?: number;
  /** Fills whatever it is put in, instead of taking a fixed size. */
  block?: boolean;
}) {
  const key = keyOf(tile);
  const width = Math.round(size * ASPECT);

  return (
    <svg
      width={block ? '100%' : width}
      height={block ? '100%' : size}
      role="img"
      aria-label={tileName(tile)}
      style={{
        display: 'block',
        flex: block ? undefined : '0 0 auto',
        aspectRatio: block ? ASPECT : undefined,
        background: FACE,
        borderRadius: '7%',
        boxShadow: `inset 0 0 0 1px ${EDGE}`,
      }}
    >
      {key && <use href={`#t-${key}`} />}
    </svg>
  );
}

/**
 * An example hand, grouped the way it is scored: each set sits together, with a
 * gap between sets so the shape of the hand is visible before the tiles are.
 */
export function TileHand({
  notation,
  size = 34,
  caption,
}: {
  notation: string;
  size?: number;
  caption?: string;
}) {
  let groups;
  try {
    groups = parseHand(notation);
  } catch {
    return null;
  }

  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <div
        className="flex flex-wrap items-end gap-x-2.5 gap-y-1.5"
        role="img"
        aria-label={handName(groups)}
      >
        {groups.map((group, index) => (
          <div
            key={index}
            className="flex gap-px"
            // The winning tile stands apart, the way it is laid down.
            style={group[0]?.winning ? { marginLeft: '0.35rem' } : undefined}
          >
            {group.map((tile, position) => (
              <span key={position} aria-hidden="true">
                <Tile tile={tile} size={size} />
              </span>
            ))}
          </div>
        ))}
      </div>
      {caption && (
        <figcaption className="text-xs" style={{ color: 'var(--muted)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
