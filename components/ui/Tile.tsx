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

/** Pip positions in a three by three grid, counted the way the tiles are cut. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [1, 0],
    [1, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
  7: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
  8: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  9: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
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

/** Where a pip or stick sits inside the 24 by 32 face. */
function at(column: number, row: number): [number, number] {
  return [6 + column * 6, 8 + row * 6];
}

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
    return (
      <>
        {PIPS[tile.rank!].map(([column, row], index) => {
          const [cx, cy] = at(column, row);
          return <circle key={index} cx={cx} cy={cy} r="2.3" fill={DOTS} />;
        })}
      </>
    );
  }

  if (tile.suit === 'bamboo') {
    // One bamboo is a bird, not a stick, on every set of tiles there is.
    if (tile.rank === 1) return <Bird />;
    return (
      <>
        {PIPS[tile.rank!].map(([column, row], index) => {
          const [cx, cy] = at(column, row);
          return (
            <g key={index}>
              <rect
                x={cx - 1.6}
                y={cy - 2.7}
                width="3.2"
                height="5.4"
                rx="1.6"
                fill={BAMBOO}
              />
              {/* The node, which is what tells a stick from a pip. */}
              <rect
                x={cx - 1.6}
                y={cy - 0.4}
                width="3.2"
                height="0.8"
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
