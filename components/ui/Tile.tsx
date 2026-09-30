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
const DOTS = '#1b5e8f';
const BAMBOO = '#17724a';
const RED = '#b3261e';
const INK = '#17211e';

/**
 * Where the pips and sticks sit, as fractions of the usable face.
 *
 * These follow the arrangements a real set is cut with, which are not a plain
 * grid: two is a vertical pair, three dots run on a diagonal, six dots stand in
 * two columns of three while six bamboo lie in two rows of three, seven dots
 * take a slanted row of three above a square of four, and eight dots stack in
 * two columns of four.
 */
type Spot = [number, number];

const DOT_LAYOUT: Record<number, Spot[]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.5, 0.12],
    [0.5, 0.88],
  ],
  3: [
    [0.13, 0.12],
    [0.5, 0.5],
    [0.87, 0.88],
  ],
  4: [
    [0.2, 0.18],
    [0.8, 0.18],
    [0.2, 0.82],
    [0.8, 0.82],
  ],
  5: [
    [0.17, 0.14],
    [0.83, 0.14],
    [0.5, 0.5],
    [0.17, 0.86],
    [0.83, 0.86],
  ],
  6: [
    [0.26, 0.1],
    [0.74, 0.1],
    [0.26, 0.5],
    [0.74, 0.5],
    [0.26, 0.9],
    [0.74, 0.9],
  ],
  // A slanted row of three above a square of four.
  7: [
    [0.15, 0.08],
    [0.5, 0.17],
    [0.85, 0.26],
    [0.26, 0.62],
    [0.74, 0.62],
    [0.26, 0.92],
    [0.74, 0.92],
  ],
  8: [
    [0.29, 0.06],
    [0.71, 0.06],
    [0.29, 0.35],
    [0.71, 0.35],
    [0.29, 0.65],
    [0.71, 0.65],
    [0.29, 0.94],
    [0.71, 0.94],
  ],
  9: [
    [0.12, 0.1],
    [0.5, 0.1],
    [0.88, 0.1],
    [0.12, 0.5],
    [0.5, 0.5],
    [0.88, 0.5],
    [0.12, 0.9],
    [0.5, 0.9],
    [0.88, 0.9],
  ],
};

const BAMBOO_LAYOUT: Record<number, Spot[]> = {
  2: [
    [0.5, 0.14],
    [0.5, 0.86],
  ],
  // One over two, the way a set is cut.
  3: [
    [0.5, 0.15],
    [0.24, 0.85],
    [0.76, 0.85],
  ],
  4: [
    [0.22, 0.16],
    [0.78, 0.16],
    [0.22, 0.84],
    [0.78, 0.84],
  ],
  5: [
    [0.17, 0.12],
    [0.83, 0.12],
    [0.5, 0.5],
    [0.17, 0.88],
    [0.83, 0.88],
  ],
  // Two rows of three, lying the other way to six dots.
  6: [
    [0.13, 0.2],
    [0.5, 0.2],
    [0.87, 0.2],
    [0.13, 0.8],
    [0.5, 0.8],
    [0.87, 0.8],
  ],
  7: [
    [0.5, 0.07],
    [0.13, 0.5],
    [0.5, 0.5],
    [0.87, 0.5],
    [0.13, 0.93],
    [0.5, 0.93],
    [0.87, 0.93],
  ],
  8: [
    [0.1, 0.2],
    [0.37, 0.2],
    [0.63, 0.2],
    [0.9, 0.2],
    [0.1, 0.8],
    [0.37, 0.8],
    [0.63, 0.8],
    [0.9, 0.8],
  ],
  9: [
    [0.12, 0.08],
    [0.5, 0.08],
    [0.88, 0.08],
    [0.12, 0.5],
    [0.5, 0.5],
    [0.88, 0.5],
    [0.12, 0.92],
    [0.5, 0.92],
    [0.88, 0.92],
  ],
};

/** The sticks a set paints red: the odd one out on five and seven, the middle row of nine. */
const BAMBOO_RED: Record<number, number[]> = {
  5: [2],
  7: [0],
  9: [3, 4, 5],
};

/** The usable area inside the 24 by 32 face, once the rounded edge is kept clear. */
const BOX = { x: 4.4, y: 5.6, width: 15.2, height: 20.8 };

function place([fx, fy]: Spot): [number, number] {
  return [BOX.x + fx * BOX.width, BOX.y + fy * BOX.height];
}

/** Pips and sticks shrink as the count grows, the way they do on a real tile. */
function scaleFor(count: number): number {
  if (count === 1) return 1.85;
  if (count <= 5) return 1;
  if (count <= 6) return 0.92;
  return 0.78;
}

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
  if (tile.suit === 'dots') {
    const spots = DOT_LAYOUT[tile.rank!];
    const r = 2.7 * scaleFor(spots.length);
    return (
      <>
        {spots.map((spot, index) => {
          const [cx, cy] = place(spot);
          return (
            <g key={index}>
              <circle cx={cx} cy={cy} r={r} fill={DOTS} />
              {/* The one of dots is a single large ring, not a plain pip. */}
              {spots.length === 1 && (
                <>
                  <circle cx={cx} cy={cy} r={r * 0.62} fill={FACE} />
                  <circle cx={cx} cy={cy} r={r * 0.3} fill={RED} />
                </>
              )}
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
    const red = new Set(BAMBOO_RED[tile.rank!] ?? []);
    return (
      <>
        {spots.map((spot, index) => {
          const [cx, cy] = place(spot);
          const colour = red.has(index) ? RED : BAMBOO;
          return (
            <g key={index}>
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
          fill={RED}
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
        stroke={DOTS}
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
      fill={
        tile.honour === 'red' ? RED : tile.honour === 'green' ? BAMBOO : INK
      }
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
        fill={BAMBOO}
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
      <circle cx="10" cy="9.6" r="2.9" fill={BAMBOO} />
      <path d="M7.3 9.2 L4.3 10.6 L7.3 11.8 Z" fill={RED} />
      <circle cx="10.9" cy="8.9" r="0.75" fill={FACE} />
      <g stroke={RED} strokeWidth="1.5" strokeLinecap="round">
        <path d="M15.4 19.6 L18.6 22.2" />
        <path d="M14.6 21.2 L17.8 24.4" />
        <path d="M13.4 22.2 L15.6 26" />
      </g>
      <rect x="5.5" y="26.4" width="13" height="1.8" rx="0.9" fill={BAMBOO} />
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
