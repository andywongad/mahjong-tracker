/**
 * The icons the header buttons wear.
 *
 * Each one is paired with a word in HeaderButton: shown as text from 600px
 * up, and always said through aria-label. None of them has to carry a meaning
 * on its own, which is what makes drawing them at 16px reasonable.
 */
const common = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

export function HomeIcon() {
  return (
    <svg {...common}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

/** Stacked rows: a list of past games. */
export function HistoryIcon() {
  return (
    <svg {...common}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

/** A tile with a line through it: the house rules this table plays by. */
export function RulesIcon() {
  return (
    <svg {...common}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function StatsIcon() {
  return (
    <svg {...common}>
      <path d="M5 20V12M12 20V5M19 20v-6" />
    </svg>
  );
}
