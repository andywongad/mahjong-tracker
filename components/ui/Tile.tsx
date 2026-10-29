'use client';

import {
  parseHand,
  tileName,
  handName,
  type Tile as TileModel,
} from '@/lib/tiles';

/**
 * Tile faces, drawn rather than typed.
 *
 * Dots and bamboo are pictures on a real tile, so they are drawn here too: a
 * font would not have them and the Chinese subset the app ships is thirteen
 * characters wide. Characters and honours are written on a real tile, so they
 * are written here, in the same hanzi stack the rest of the app uses.
 *
 * The face stays cream in dark mode. A tile is an object, not a surface, and a
 * dark mahjong tile would be a different object.
 */

const FACE = '#fcfcf7';
const EDGE = '#00000026';
const INK = '#17211e';
/** The three mark colours a set is painted in. */
const G = '#1e7a5c';
const R = '#c23128';
const B = '#2e4c9c';
const OCHRE = '#a86e12';

type Spot3 = [number, number, string];

/**
 * Where each pip sits and what colour it is. A real set is not one colour per
 * suit: the dots alternate blue, green and red by position, and the one of
 * dots is a single large ring rather than a pip at all.
 */
const DOT_LAYOUT: Record<number, Spot3[]> = {
  2: [
    [0.5, 0.14, G],
    [0.5, 0.86, B],
  ],
  3: [
    [0.13, 0.1, B],
    [0.5, 0.5, R],
    [0.87, 0.9, G],
  ],
  4: [
    [0.2, 0.18, B],
    [0.8, 0.18, G],
    [0.2, 0.82, G],
    [0.8, 0.82, B],
  ],
  5: [
    [0.17, 0.14, B],
    [0.83, 0.14, G],
    [0.5, 0.5, R],
    [0.17, 0.86, G],
    [0.83, 0.86, B],
  ],
  6: [
    [0.26, 0.1, G],
    [0.74, 0.1, G],
    [0.26, 0.5, R],
    [0.74, 0.5, R],
    [0.26, 0.9, R],
    [0.74, 0.9, R],
  ],
  // A slanted row of three above a square of four.
  7: [
    [0.13, 0.06, G],
    [0.5, 0.17, G],
    [0.87, 0.28, G],
    [0.26, 0.62, R],
    [0.74, 0.62, R],
    [0.26, 0.92, R],
    [0.74, 0.92, R],
  ],
  8: [
    [0.29, 0.06, B],
    [0.71, 0.06, B],
    [0.29, 0.35, B],
    [0.71, 0.35, B],
    [0.29, 0.65, B],
    [0.71, 0.65, B],
    [0.29, 0.94, B],
    [0.71, 0.94, B],
  ],
  9: [
    [0.12, 0.1, B],
    [0.5, 0.1, B],
    [0.88, 0.1, B],
    [0.12, 0.5, R],
    [0.5, 0.5, R],
    [0.88, 0.5, R],
    [0.12, 0.9, G],
    [0.5, 0.9, G],
    [0.88, 0.9, G],
  ],
};

/**
 * Sticks, with their colours. The prototype settles a question our own tiles
 * left open: the eight is slanted into an hourglass rather than standing in
 * two straight rows, which is how a set is cut.
 */
const BAMBOO_LAYOUT: Record<
  number,
  (Spot3 | [number, number, string, number])[]
> = {
  2: [
    [0.5, 0.14, B],
    [0.5, 0.86, G],
  ],
  3: [
    [0.5, 0.15, B],
    [0.24, 0.85, G],
    [0.76, 0.85, G],
  ],
  4: [
    [0.22, 0.16, B],
    [0.78, 0.16, G],
    [0.22, 0.84, G],
    [0.78, 0.84, B],
  ],
  5: [
    [0.17, 0.12, G],
    [0.83, 0.12, B],
    [0.5, 0.5, R],
    [0.17, 0.88, B],
    [0.83, 0.88, G],
  ],
  6: [
    [0.13, 0.2, G],
    [0.5, 0.2, G],
    [0.87, 0.2, G],
    [0.13, 0.8, B],
    [0.5, 0.8, B],
    [0.87, 0.8, B],
  ],
  7: [
    [0.5, 0.07, R],
    [0.13, 0.5, G],
    [0.5, 0.5, G],
    [0.87, 0.5, G],
    [0.13, 0.93, B],
    [0.5, 0.93, B],
    [0.87, 0.93, B],
  ],
  8: [
    [0.1, 0.2, G, 0],
    [0.37, 0.2, G, 18],
    [0.63, 0.2, G, -18],
    [0.9, 0.2, G, 0],
    [0.1, 0.8, B, 0],
    [0.37, 0.8, B, -18],
    [0.63, 0.8, B, 18],
    [0.9, 0.8, B, 0],
  ],
  9: [
    [0.12, 0.08, B],
    [0.5, 0.08, R],
    [0.88, 0.08, G],
    [0.12, 0.5, B],
    [0.5, 0.5, R],
    [0.88, 0.5, G],
    [0.12, 0.92, B],
    [0.5, 0.92, R],
    [0.88, 0.92, G],
  ],
};

/** The usable area inside the 24 by 32 face, once the rounded edge is kept clear. */
const BOX = { x: 4.4, y: 5.6, width: 15.2, height: 20.8 };

function place([fx, fy]: readonly [number, number, ...unknown[]]): [
  number,
  number,
] {
  return [BOX.x + fx * BOX.width, BOX.y + fy * BOX.height];
}

/** Pips and sticks shrink as the count grows, the way they do on a real tile. */
function scaleFor(count: number): number {
  if (count === 1) return 1.85;
  if (count <= 5) return 1;
  if (count <= 6) return 0.92;
  return 0.78;
}

/** Flowers and seasons, which are written rather than drawn. */
const BONUS_CHARS: Record<string, string> = {
  f1: '梅',
  f2: '蘭',
  f3: '菊',
  f4: '竹',
  s1: '春',
  s2: '夏',
  s3: '秋',
  s4: '冬',
};

const HONOUR_CHARS: Record<string, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
  red: '中',
  green: '發',
};

const NUMERALS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function Tile({ tile, size = 34 }: { tile: TileModel; size?: number }) {
  const width = Math.round(size * 0.72);

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 24 32"
      role="img"
      aria-label={tileName(tile)}
      style={{ flex: '0 0 auto' }}
    >
      <rect
        x="0.6"
        y="0.6"
        width="22.8"
        height="30.8"
        rx="3.4"
        fill={FACE}
        stroke={EDGE}
        strokeWidth="1.2"
      />
      <Face tile={tile} />
    </svg>
  );
}

function Face({ tile }: { tile: TileModel }) {
  if (tile.suit === 'bonus') {
    return (
      <>
        <text
          x="12"
          y="18"
          textAnchor="middle"
          className="hanzi"
          fontSize="13"
          fill={OCHRE}
        >
          {BONUS_CHARS[tile.bonus ?? ''] ?? ''}
        </text>
        <text
          x="12"
          y="27"
          textAnchor="middle"
          className="tnum"
          fontSize="7"
          fill={INK}
          opacity="0.55"
        >
          {tile.bonus?.slice(1)}
        </text>
      </>
    );
  }

  if (tile.suit === 'dots') {
    // The one of dots is rings rather than a pip, on every set there is.
    if (tile.rank === 1) {
      const [cx, cy] = place([0.5, 0.5]);
      return (
        <>
          <circle cx={cx} cy={cy} r={7.4} fill={B} />
          <circle cx={cx} cy={cy} r={5.4} fill={FACE} />
          <circle cx={cx} cy={cy} r={4} fill={G} />
          <circle cx={cx} cy={cy} r={2.4} fill={FACE} />
          <circle cx={cx} cy={cy} r={1.4} fill={R} />
        </>
      );
    }
    const spots = DOT_LAYOUT[tile.rank!];
    const r = 2.7 * scaleFor(spots.length);
    return (
      <>
        {spots.map((spot, index) => {
          const [cx, cy] = place(spot);
          return (
            <g key={index}>
              <circle cx={cx} cy={cy} r={r} fill={spot[2]} />
              <circle cx={cx} cy={cy} r={r * 0.34} fill={FACE} />
            </g>
          );
        })}
      </>
    );
  }

  if (tile.suit === 'bamboo') {
    // One bamboo is a bird, not a stick, on every set of tiles there is.
    if (tile.rank === 1) return <Bird />;
    const spots = BAMBOO_LAYOUT[tile.rank!];
    const scale = scaleFor(spots.length);
    // Long and thin, so a stick never reads as a pip.
    const halfWidth = 1.25 * scale;
    const halfHeight = 3.3 * scale;
    return (
      <>
        {spots.map((spot, index) => {
          const [cx, cy] = place(spot);
          const colour = spot[2];
          const tilt = (spot as [number, number, string, number])[3] ?? 0;
          return (
            <g
              key={index}
              transform={tilt ? `rotate(${tilt} ${cx} ${cy})` : undefined}
            >
              <rect
                x={cx - halfWidth}
                y={cy - halfHeight}
                width={halfWidth * 2}
                height={halfHeight * 2}
                rx={halfWidth}
                fill={colour}
              />
              {/* The node, which is what tells a stick from a pip. */}
              <rect
                x={cx - halfWidth}
                y={cy - 0.4 * scale}
                width={halfWidth * 2}
                height={0.8 * scale}
                fill={FACE}
                opacity="0.85"
              />
            </g>
          );
        })}
      </>
    );
  }

  if (tile.suit === 'characters') {
    return (
      <>
        <text
          x="12"
          y="13.5"
          textAnchor="middle"
          className="hanzi"
          fontSize="11"
          fill={INK}
        >
          {NUMERALS[tile.rank!]}
        </text>
        <text
          x="12"
          y="27"
          textAnchor="middle"
          className="hanzi"
          fontSize="12"
          fill={R}
        >
          萬
        </text>
      </>
    );
  }

  // The white dragon is a blank tile inside a blue frame: the only honour that
  // is drawn rather than written.
  if (tile.honour === 'white') {
    return (
      <rect
        x="5"
        y="6"
        width="14"
        height="20"
        rx="1.5"
        fill="none"
        stroke={B}
        strokeWidth="1.6"
      />
    );
  }

  return (
    <text
      x="12"
      y="22"
      textAnchor="middle"
      className="hanzi"
      fontSize="16"
      fill={tile.honour === 'red' ? R : tile.honour === 'green' ? G : INK}
    >
      {HONOUR_CHARS[tile.honour!]}
    </text>
  );
}

/** The bird on the one of bamboo: green body, red beak and tail, on a branch. */
function Bird() {
  return (
    <>
      <ellipse
        cx="12.4"
        cy="16.4"
        rx="3.7"
        ry="5.6"
        transform="rotate(-20 12.4 16.4)"
        fill={G}
      />
      <ellipse
        cx="13.1"
        cy="15.8"
        rx="1.8"
        ry="3.2"
        transform="rotate(-20 13.1 15.8)"
        fill={FACE}
        opacity="0.5"
      />
      <circle cx="10" cy="9.6" r="2.9" fill={G} />
      <path d="M7.3 9.2 L4.3 10.6 L7.3 11.8 Z" fill={R} />
      <circle cx="10.9" cy="8.9" r="0.75" fill={FACE} />
      <g stroke={R} strokeWidth="1.5" strokeLinecap="round">
        <path d="M15.4 19.6 L18.6 22.2" />
        <path d="M14.6 21.2 L17.8 24.4" />
        <path d="M13.4 22.2 L15.6 26" />
      </g>
      <rect x="5.5" y="26.4" width="13" height="1.8" rx="0.9" fill={G} />
    </>
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
