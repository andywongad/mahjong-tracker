'use client';

import { useMemo, useRef, useState } from 'react';
import { SEATS, type BySeat, type Seat } from '@/lib/scoring';
import { seatColor } from '@/lib/game/seats';
import { formatSigned } from '@/components/ui/Score';

const W = 360;
const H = 225;
const PAD = { top: 12, right: 84, bottom: 24, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
/** Keep end labels from sitting on top of each other. */
const LABEL_MIN_GAP = 15;

/**
 * Running score over the game, one line per player. The zero line is
 * emphasised because crossing it is what players actually watch, and each line
 * is labelled at its end so identity never rests on colour alone.
 */
export function ScoreChart({
  series,
  players,
}: {
  series: BySeat<number[]>;
  players: BySeat<string>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handCount = series[0].length - 1;

  const { x, y, paths, endLabels, ticks } = useMemo(() => {
    const values = series.flat();
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(0, ...values);
    // A little headroom, and never a zero height plot.
    const span = Math.max(rawMax - rawMin, 1);
    const pad = span * 0.08;
    const min = rawMin - pad;
    const max = rawMax + pad;

    const xOf = (index: number) =>
      PAD.left + (handCount === 0 ? PLOT_W / 2 : (index / handCount) * PLOT_W);
    const yOf = (value: number) =>
      PAD.top + PLOT_H - ((value - min) / (max - min)) * PLOT_H;

    const linePaths = SEATS.map((seat: Seat) =>
      series[seat]
        .map((value, index) => `${index === 0 ? 'M' : 'L'}${xOf(index)},${yOf(value)}`)
        .join(' '),
    );

    // Lay end labels out in score order, nudged apart where they collide.
    const ordered = SEATS.map((seat: Seat) => ({
      seat,
      value: series[seat][series[seat].length - 1],
      y: yOf(series[seat][series[seat].length - 1]),
    })).sort((a, b) => a.y - b.y);

    for (let i = 1; i < ordered.length; i += 1) {
      const gap = ordered[i].y - ordered[i - 1].y;
      if (gap < LABEL_MIN_GAP) ordered[i].y = ordered[i - 1].y + LABEL_MIN_GAP;
    }
    const overflow = ordered[ordered.length - 1].y - (PAD.top + PLOT_H);
    if (overflow > 0) for (const item of ordered) item.y -= overflow;

    const tickValues = [rawMax, 0, rawMin].filter(
      (value, index, all) => all.indexOf(value) === index,
    );

    return {
      x: xOf,
      y: yOf,
      paths: linePaths,
      endLabels: ordered,
      ticks: tickValues.map((value) => ({ value, y: yOf(value) })),
    };
  }, [series, handCount]);

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || handCount === 0) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const position = (ratio * W - PAD.left) / PLOT_W;
    const index = Math.round(position * handCount);
    setActiveIndex(Math.min(handCount, Math.max(0, index)));
  }

  return (
    <figure className="m-0 flex flex-col gap-2">
      {/* Legend, so identity is available without reading the line ends. */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {SEATS.map((seat: Seat) => (
          <li key={seat} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: seatColor(seat) }}
            />
            <span>{players[seat]}</span>
          </li>
        ))}
      </ul>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label={`Running score across ${handCount} hands. ${SEATS.map(
          (seat: Seat) => `${players[seat]} ${formatSigned(series[seat][handCount])}`,
        ).join(', ')}.`}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {/* Scale marks, kept recessive. */}
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={tick.y + 3}
              textAnchor="end"
              className="tnum"
              fontSize={11}
              fill="var(--muted)"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* The zero line carries more weight than the other marks. */}
        <line
          x1={PAD.left}
          x2={PAD.left + PLOT_W}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--muted)"
          strokeWidth={1.5}
          strokeOpacity={0.65}
        />

        {activeIndex !== null && (
          <line
            x1={x(activeIndex)}
            x2={x(activeIndex)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="var(--muted)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {SEATS.map((seat: Seat) => (
          <path
            key={seat}
            d={paths[seat]}
            fill="none"
            stroke={seatColor(seat)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Points under the crosshair, ringed so overlaps stay readable. */}
        {activeIndex !== null &&
          SEATS.map((seat: Seat) => (
            <circle
              key={seat}
              cx={x(activeIndex)}
              cy={y(series[seat][activeIndex])}
              r={4}
              fill={seatColor(seat)}
              stroke="var(--tile-face)"
              strokeWidth={2}
            />
          ))}

        {/* Direct labels: a colour carries identity, the text stays in ink. */}
        {endLabels.map((label) => (
          <g key={label.seat}>
            <circle
              cx={PAD.left + PLOT_W + 8}
              cy={label.y}
              r={3.5}
              fill={seatColor(label.seat)}
            />
            <text
              x={PAD.left + PLOT_W + 15}
              y={label.y + 3.5}
              fontSize={11.5}
              fill="var(--ink)"
            >
              <tspan>{players[label.seat]}</tspan>
              <tspan className="tnum" fontWeight={700} dx={4}>
                {formatSigned(label.value)}
              </tspan>
            </text>
          </g>
        ))}

        <text
          x={PAD.left}
          y={H - 5}
          fontSize={11}
          fill="var(--muted)"
        >
          Hand 1
        </text>
        <text
          x={PAD.left + PLOT_W}
          y={H - 5}
          fontSize={11}
          textAnchor="end"
          fill="var(--muted)"
          className="tnum"
        >
          {handCount}
        </text>
      </svg>

      <figcaption className="text-xs" style={{ color: 'var(--muted)' }}>
        {activeIndex === null ? (
          <>Running score after each hand. Touch the chart to read a hand.</>
        ) : (
          <span className="flex flex-wrap gap-x-3">
            <span className="font-semibold">
              {activeIndex === 0 ? 'Start' : `Hand ${activeIndex}`}
            </span>
            {SEATS.map((seat: Seat) => (
              <span key={seat} className="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: seatColor(seat) }}
                />
                <span className="tnum">{formatSigned(series[seat][activeIndex])}</span>
              </span>
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
