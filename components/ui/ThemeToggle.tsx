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

const LABELS: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };

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
      className="touch inline-flex items-center rounded-full px-3 text-xs font-semibold"
      style={{ background: 'var(--felt-soft)', color: 'var(--ink-on-felt)' }}
      aria-label={`Theme: ${LABELS[theme]}. Tap to change.`}
      suppressHydrationWarning
    >
      {LABELS[theme]}
    </button>
  );
}

/** Applied before paint so the page never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;
