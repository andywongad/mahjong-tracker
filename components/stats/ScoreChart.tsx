'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  SEATS,
  WIND_CHARS,
  type BySeat,
  type Seat,
  type Wind,
} from '@/lib/scoring';
import { seatColor } from '@/lib/game/seats';
import { formatSigned } from '@/components/ui/Score';
import { ScoreTable } from './ScoreTable';

/**
 * Height is a property of the device, not of the container: the chart in a
 * desktop side column is 400px wide but still deserves a desktop's height.
 */
const HEIGHTS: { query: string; height: number }[] = [
  { query: '(min-width: 1024px)', height: 300 },
  { query: '(min-width: 600px)', height: 280 },
];
const PHONE_HEIGHT = 220;

/** Axis text in real pixels. Nothing here is allowed to scale with width. */
const AXIS_SIZE = 12;
const LABEL_SIZE = 13;
const PAD = { top: 10, bottom: 36, left: 36 };
/** Roughly how wide a character is at the label size, for reserving the gutter. */
const CHAR_W = 7;
/** Below this much plot, end labels cost more than they give; the legend carries it. */
const MIN_PLOT_W = 220;
const LABEL_MIN_GAP = LABEL_SIZE + 3;

function subscribeToWidth(listener: () => void): () => void {
  const lists = HEIGHTS.map(({ query }) => window.matchMedia(query));
  for (const list of lists) list.addEventListener('change', listener);
  return () => {
    for (const list of lists) list.removeEventListener('change', listener);
  };
}

function currentHeight(): number {
  for (const { query, height } of HEIGHTS) {
    if (window.matchMedia(query).matches) return height;
  }
  return PHONE_HEIGHT;
}

/** A step of 1, 2 or 5 times a power of ten, so the labels are numbers people say. */
function niceStep(span: number, target: number): number {
  const rough = Math.max(span, 1) / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const factor =
    normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return factor * magnitude;
}

/**
 * Running score over the game, one line per player.
 *
 * The rebuild is about one thing: the SVG is drawn at its real pixel size
 * rather than scaled from a fixed viewBox, so 12px type is 12px at 390 and at
 * 1280. Everything else follows from that — ticks can be chosen for the height
 * they have, and the end labels can be given a gutter that actually fits them.
 */
export function ScoreChart({
  series,
  players,
  rounds = [],
}: {
  series: BySeat<number[]>;
  players: BySeat<string>;
  /** The prevailing wind of each hand, used to band the game into rounds. */
  rounds?: Wind[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    from: number;
    moved: boolean;
    wasHeld: boolean;
  } | null>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // A hover readout vanishes the moment you look away, which is no use on a
  // phone. Tapping holds it until you tap again.
  const [pinned, setPinned] = useState(false);
  const [view, setView] = useState<'chart' | 'values'>('chart');
  // One line on its own has room for a figure at every hand, which four lines
  // never do. Tapping a name in the legend is how you ask for that.
  const [onlySeat, setOnlySeat] = useState<Seat | null>(null);

  const height = useSyncExternalStore(
    subscribeToWidth,
    currentHeight,
    () => PHONE_HEIGHT,
  );

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handCount = series[0].length - 1;

  const chart = useMemo(() => {
    if (width === 0) return null;

    // The gutter is sized to the longest label so nothing is ever clipped, and
    // given up entirely when the plot would be squeezed below reading width.
    const longest = Math.max(
      ...SEATS.map(
        (seat: Seat) =>
          players[seat].length +
          formatSigned(series[seat][handCount]).length +
          2,
      ),
    );
    const wanted = Math.min(longest * CHAR_W + 14, width * 0.4);
    // With one player the last point carries its own figure, so the gutter the
    // end labels needed goes back to the plot.
    const showEndLabels =
      onlySeat === null && width - PAD.left - wanted >= MIN_PLOT_W;
    const right = showEndLabels ? wanted : 12;

    const plotW = Math.max(width - PAD.left - right, 1);
    const plotH = Math.max(height - PAD.top - PAD.bottom, 1);

    const values = series.flat();
    const step = niceStep(
      Math.max(0, ...values) - Math.min(0, ...values),
      plotH < 240 ? 3 : 4,
    );
    const min = Math.floor(Math.min(0, ...values) / step) * step;
    const max = Math.ceil(Math.max(0, ...values) / step) * step;

    const xOf = (index: number) =>
      PAD.left + (handCount === 0 ? plotW / 2 : (index / handCount) * plotW);
    const yOf = (value: number) =>
      PAD.top + plotH - ((value - min) / Math.max(max - min, 1)) * plotH;

    const yTicks: number[] = [];
    for (let value = min; value <= max + 1e-9; value += step) {
      yTicks.push(Math.round(value));
    }

    // Every fifth hand, plus the last one when it does not crowd the label before it.
    const xTicks: number[] = [];
    for (let hand = 5; hand <= handCount; hand += 5) xTicks.push(hand);
    if (
      handCount > 0 &&
      handCount % 5 !== 0 &&
      handCount - (xTicks.at(-1) ?? 0) >= 2
    ) {
      xTicks.push(handCount);
    }

    // Rounds as bands: the story of a game is usually "who ran away with which round".
    const bands: { wind: Wind; from: number; to: number }[] = [];
    for (let hand = 1; hand <= rounds.length && hand <= handCount; hand += 1) {
      const wind = rounds[hand - 1];
      const last = bands.at(-1);
      if (last && last.wind === wind) last.to = hand;
      else bands.push({ wind, from: hand - 1, to: hand });
    }

    const paths = SEATS.map((seat: Seat) =>
      series[seat]
        .map(
          (value, index) =>
            `${index === 0 ? 'M' : 'L'}${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`,
        )
        .join(' '),
    );

    // Laid out in score order and nudged apart, then pulled back inside the plot.
    const endLabels = SEATS.map((seat: Seat) => ({
      seat,
      value: series[seat][handCount],
      y: yOf(series[seat][handCount]),
    })).sort((a, b) => a.y - b.y);

    for (let i = 1; i < endLabels.length; i += 1) {
      const gap = endLabels[i].y - endLabels[i - 1].y;
      if (gap < LABEL_MIN_GAP)
        endLabels[i].y = endLabels[i - 1].y + LABEL_MIN_GAP;
    }
    const overflow = endLabels[endLabels.length - 1].y - (PAD.top + plotH);
    if (overflow > 0) for (const label of endLabels) label.y -= overflow;
    const underflow = PAD.top - endLabels[0].y;
    if (underflow > 0) for (const label of endLabels) label.y += underflow;

    // Every hand's figure, for the one player being read on their own. Odd
    // hands sit above the line and even ones below, so neighbours never share
    // a row; anything that still collides is dropped rather than overlapped.
    const pointLabels: { x: number; y: number; text: string }[] = [];
    if (onlySeat !== null) {
      const placed: { x1: number; x2: number; y: number }[] = [];
      for (let hand = 1; hand <= handCount; hand += 1) {
        const value = series[onlySeat][hand];
        const text = value === 0 ? '0' : formatSigned(value);
        const halfWidth = (text.length * CHAR_W + 8) / 2;
        const x = xOf(hand);
        const y = yOf(value) + (hand % 2 ? -11 : 15);
        const clash = placed.some(
          (other) =>
            x - halfWidth < other.x2 &&
            x + halfWidth > other.x1 &&
            Math.abs(y - other.y) < LABEL_SIZE + 2,
        );
        if (clash) continue;
        // Never let a figure sit outside the plot it belongs to.
        if (y < PAD.top + LABEL_SIZE || y > PAD.top + plotH) continue;
        placed.push({ x1: x - halfWidth, x2: x + halfWidth, y });
        pointLabels.push({ x, y, text });
      }
    }

    return {
      xOf,
      yOf,
      pointLabels,
      plotW,
      plotH,
      paths,
      yTicks,
      xTicks,
      bands,
      endLabels,
      showEndLabels,
    };
  }, [width, height, series, players, handCount, rounds, onlySeat]);

  function indexAt(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || !chart || handCount === 0) return null;
    const rect = svg.getBoundingClientRect();
    const position = (clientX - rect.left - PAD.left) / chart.plotW;
    return Math.min(handCount, Math.max(0, Math.round(position * handCount)));
  }

  /**
   * Pressing shows a hand and holds it, dragging runs along the game, and
   * lifting leaves the readout where you left it. A finger cannot hover, so
   * holding is the only way the scores survive letting go.
   */
  function press(event: React.PointerEvent<SVGSVGElement>) {
    const index = indexAt(event.clientX);
    if (index === null) return;
    // Captured so a drag keeps tracking after it leaves the chart.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      from: index,
      moved: false,
      wasHeld: pinned && index === activeIndex,
    };
    setActiveIndex(index);
    setPinned(true);
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    const index = indexAt(event.clientX);
    if (index === null) return;
    if (drag.current) {
      if (index !== drag.current.from) drag.current.moved = true;
      setActiveIndex(index);
      return;
    }
    // A mouse reads by hovering, until something is being held.
    if (!pinned) setActiveIndex(index);
  }

  function release() {
    const gesture = drag.current;
    drag.current = null;
    // Tapping the hand already held is how you let it go again.
    if (gesture && !gesture.moved && gesture.wasHeld) {
      setPinned(false);
      setActiveIndex(null);
    }
  }

  function step(event: React.KeyboardEvent<SVGSVGElement>) {
    if (handCount === 0) return;
    const current = activeIndex ?? handCount;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in moves) {
      event.preventDefault();
      setPinned(true);
      setActiveIndex(
        Math.min(handCount, Math.max(0, current + moves[event.key])),
      );
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setPinned(true);
      setActiveIndex(event.key === 'Home' ? 0 : handCount);
      return;
    }
    if (event.key === 'Escape') {
      setPinned(false);
      setActiveIndex(null);
    }
  }

  /** The four players at the hand being read, best first. */
  const readout =
    activeIndex === null
      ? null
      : SEATS.map((seat: Seat) => ({
          seat,
          name: players[seat],
          value: series[seat][activeIndex],
        })).sort((a, b) => b.value - a.value);

  const summary = SEATS.map(
    (seat: Seat) => `${players[seat]} ${formatSigned(series[seat][handCount])}`,
  ).join(', ');

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* Identity is never only a colour: the legend names every line. */}
        <ul className="flex flex-wrap gap-x-1 gap-y-1">
          {SEATS.map((seat: Seat) => {
            const selected = onlySeat === seat;
            return (
              <li key={seat}>
                <button
                  type="button"
                  onClick={() => setOnlySeat(selected ? null : seat)}
                  aria-pressed={selected}
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs"
                  style={{
                    background: selected ? 'var(--line)' : undefined,
                    opacity: onlySeat === null || selected ? 1 : 0.5,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: seatColor(seat) }}
                  />
                  <span className={selected ? 'font-semibold' : undefined}>
                    {players[seat]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* A line tells you the shape of a game. When you want the figure at
          hand eleven, you want it written down. */}
        <div
          className="flex shrink-0 overflow-hidden rounded-lg"
          style={{ border: '1px solid var(--line-strong)' }}
          role="group"
          aria-label="How to show the running score"
        >
          {(['chart', 'values'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              aria-pressed={view === option}
              className="px-2.5 py-1 text-xs font-semibold capitalize"
              style={
                view === option
                  ? { background: 'var(--ink)', color: 'var(--tile-face)' }
                  : { color: 'var(--muted)' }
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === 'values' && (
        <ScoreTable series={series} players={players} rounds={rounds} />
      )}

      <div
        ref={wrapRef}
        className="relative"
        style={{ height, display: view === 'chart' ? undefined : 'none' }}
      >
        {chart && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="touch-pan-y outline-none"
            role="img"
            aria-label={`Running score across ${handCount} hands. ${summary}. Use the arrow keys to read each hand.`}
            tabIndex={0}
            onPointerDown={press}
            onPointerMove={move}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={() => {
              if (!pinned && !drag.current) setActiveIndex(null);
            }}
            onKeyDown={step}
            onBlur={() => {
              if (pinned) return;
              setActiveIndex(null);
            }}
          >
            {/* Alternate rounds get a wash, so the bands read without a border. */}
            {chart.bands.map((band, index) =>
              index % 2 === 1 ? (
                <rect
                  key={`${band.wind}-${band.from}`}
                  x={chart.xOf(band.from)}
                  y={PAD.top}
                  width={chart.xOf(band.to) - chart.xOf(band.from)}
                  height={chart.plotH}
                  fill="var(--line)"
                  fillOpacity={0.5}
                />
              ) : null,
            )}

            {chart.yTicks.map((value) => (
              <g key={value}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + chart.plotW}
                  y1={chart.yOf(value)}
                  y2={chart.yOf(value)}
                  stroke={value === 0 ? 'var(--muted)' : 'var(--line)'}
                  strokeWidth={value === 0 ? 1.5 : 1}
                  strokeOpacity={value === 0 ? 0.65 : 1}
                />
                <text
                  x={PAD.left - 6}
                  y={chart.yOf(value) + 4}
                  textAnchor="end"
                  className="tnum"
                  fontSize={AXIS_SIZE}
                  fill="var(--muted)"
                >
                  {value}
                </text>
              </g>
            ))}

            {chart.xTicks.map((hand) => (
              <text
                key={hand}
                x={chart.xOf(hand)}
                y={PAD.top + chart.plotH + AXIS_SIZE + 4}
                textAnchor="middle"
                className="tnum"
                fontSize={AXIS_SIZE}
                fill="var(--muted)"
              >
                {hand}
              </text>
            ))}

            {/* The wind each band was played under, which is the context that
              makes a run of losses make sense. */}
            {chart.bands.map((band) => (
              <text
                key={`wind-${band.from}`}
                x={(chart.xOf(band.from) + chart.xOf(band.to)) / 2}
                y={PAD.top + chart.plotH + AXIS_SIZE * 2 + 6}
                textAnchor="middle"
                lang="zh-Hant"
                className="hanzi"
                fontSize={AXIS_SIZE}
                fill="var(--muted)"
              >
                {WIND_CHARS[band.wind]}
              </text>
            ))}

            {activeIndex !== null && (
              <line
                x1={chart.xOf(activeIndex)}
                x2={chart.xOf(activeIndex)}
                y1={PAD.top}
                y2={PAD.top + chart.plotH}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {SEATS.map((seat: Seat) => (
              <path
                key={seat}
                d={chart.paths[seat]}
                fill="none"
                stroke={seatColor(seat)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={onlySeat === null || onlySeat === seat ? 1 : 0.16}
              />
            ))}

            {/* A dot for every hand, so each figure has something to sit on. */}
            {onlySeat !== null &&
              series[onlySeat].map((value, hand) =>
                hand === 0 ? null : (
                  <circle
                    key={hand}
                    cx={chart.xOf(hand)}
                    cy={chart.yOf(value)}
                    r={2.5}
                    fill={seatColor(onlySeat)}
                  />
                ),
              )}

            {chart.pointLabels.map((label) => (
              <text
                key={label.x}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                className="tnum"
                fontSize={LABEL_SIZE}
                fontWeight={600}
                fill="var(--ink)"
                stroke="var(--tile-face)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {label.text}
              </text>
            ))}

            {activeIndex !== null &&
              SEATS.map((seat: Seat) => (
                <circle
                  key={seat}
                  cx={chart.xOf(activeIndex)}
                  cy={chart.yOf(series[seat][activeIndex])}
                  r={4}
                  fill={seatColor(seat)}
                  stroke="var(--tile-face)"
                  strokeWidth={2}
                />
              ))}

            {chart.showEndLabels &&
              chart.endLabels.map((label) => (
                <g key={label.seat}>
                  <circle
                    cx={PAD.left + chart.plotW + 8}
                    cy={label.y}
                    r={3.5}
                    fill={seatColor(label.seat)}
                  />
                  <text
                    x={PAD.left + chart.plotW + 16}
                    y={label.y + 4}
                    fontSize={LABEL_SIZE}
                    fill="var(--ink)"
                  >
                    <tspan>{players[label.seat]}</tspan>
                    <tspan className="tnum" fontWeight={700} dx={5}>
                      {formatSigned(label.value)}
                    </tspan>
                  </text>
                </g>
              ))}
          </svg>
        )}

        {chart && readout && activeIndex !== null && (
          <div
            className="pointer-events-none absolute z-10 max-w-[60%] rounded-lg px-2 py-1.5"
            style={{
              top: PAD.top,
              // Flips to the other side of the crosshair near the right edge,
              // so the readout is never half off the chart.
              ...(chart.xOf(activeIndex) > width * 0.55
                ? { right: width - chart.xOf(activeIndex) + 10 }
                : { left: chart.xOf(activeIndex) + 10 }),
              background: 'var(--tile-face)',
              border: '1px solid var(--line-strong)',
              boxShadow: 'var(--shadow-tile-sm)',
            }}
            role="status"
            aria-live="polite"
          >
            <p
              className="mb-1 text-[0.7rem] font-semibold"
              style={{ color: 'var(--muted)' }}
            >
              {activeIndex === 0 ? 'Start' : `After hand ${activeIndex}`}
            </p>
            <ul className="flex flex-col gap-0.5">
              {readout.map((entry) => (
                <li
                  key={entry.seat}
                  className="flex items-center justify-between gap-2.5 text-[0.7rem] whitespace-nowrap"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: seatColor(entry.seat) }}
                    />
                    <span className="truncate">{entry.name}</span>
                  </span>
                  <span
                    className="tnum font-semibold"
                    style={{
                      color:
                        entry.value === 0
                          ? 'var(--muted)'
                          : entry.value > 0
                            ? 'var(--gain)'
                            : 'var(--loss)',
                    }}
                  >
                    {entry.value === 0 ? '0' : formatSigned(entry.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {view === 'chart' && (
        <figcaption className="text-xs" style={{ color: 'var(--muted)' }}>
          {onlySeat !== null ? (
            <>
              Every hand {players[onlySeat]} played, with their score after each
              one. Tap their name again to bring the other three back.
            </>
          ) : activeIndex !== null ? (
            <>
              Showing{' '}
              <span className="font-semibold">
                {activeIndex === 0 ? 'the start' : `hand ${activeIndex}`}
              </span>
              . Keep dragging sideways to move through the game, or tap the same
              hand again to let it go.
            </>
          ) : (
            // Three separate things you can do, so three lines rather than
            // one sentence to pick them out of.
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>
                Drag sideways across the chart to watch the scores change hand
                by hand.
              </li>
              <li>
                Tap a name above to follow one player and see their score at
                every hand.
              </li>
              <li>
                Switch to <span className="font-semibold">Values</span> to read
                the whole game as numbers.
              </li>
            </ul>
          )}
        </figcaption>
      )}
    </figure>
  );
}
