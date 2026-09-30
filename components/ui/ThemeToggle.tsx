'use client';

import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'mahjong-theme';
const THEME_EVENT = 'mahjong:themechange';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  // Another tab changing the preference should be reflected here too.
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** The server cannot know the preference, so it renders the neutral one. */
const getServerSnapshot = (): Theme => 'system';

/**
 * Sun for light, moon and stars for dark, half of each for following the
 * device. The word alone never said much; the pair is what people read.
 */
function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: false,
  } as const;

  if (theme === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        <g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4" />
          <path d="M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M19.2 4.8l-1.7 1.7M6.5 17.5l-1.7 1.7" />
        </g>
      </svg>
    );
  }

  if (theme === 'dark') {
    return (
      <svg {...common}>
        <g transform="translate(0.5 4) scale(0.78)">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
          />
        </g>
        <circle cx="19.4" cy="5.6" r="1.3" fill="currentColor" />
        <circle cx="16.4" cy="2.4" r="0.85" fill="currentColor" />
      </svg>
    );
  }

  // Half sun, half moon. The rays sit only on the lit side and the star only on
  // the dark one, so the two halves stay legible at 15px.
  return (
    <svg {...common}>
      <circle
        cx="11.5"
        cy="12"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M11.5 7a5 5 0 0 0 0 10z" fill="currentColor" />
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M1.4 12h2.3M4 4.5l1.7 1.7M4 19.5l1.7-1.7" />
      </g>
      <circle cx="19.6" cy="5.4" r="1.4" fill="currentColor" />
      <circle cx="21" cy="10" r="0.9" fill="currentColor" />
    </svg>
  );
}

const LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * What the button is now, and what one tap will make it. A cycling control has
 * to say both, or the only way to find out is to press it.
 */
const DESCRIPTIONS: Record<Theme, string> = {
  system: 'Theme follows your device. Tap for light.',
  light: 'Light theme. Tap for dark.',
  dark: 'Dark theme. Tap to follow your device.',
};

/** Cycle through following the system, light, and dark. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const next = useCallback(() => {
    const order: Theme[] = ['system', 'light', 'dark'];
    const value = order[(order.indexOf(getSnapshot()) + 1) % order.length];

    const root = document.documentElement;
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);

    try {
      if (value === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // A blocked storage write only costs the preference on the next visit.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={next}
      className="touch inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
      style={{ background: 'var(--felt-soft)', color: 'var(--ink-on-felt)' }}
      aria-label={DESCRIPTIONS[theme]}
      title={DESCRIPTIONS[theme]}
      suppressHydrationWarning
    >
      <ThemeIcon theme={theme} />
      {LABELS[theme]}
    </button>
  );
}

/** Applied before paint so the page never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;
