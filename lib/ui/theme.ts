'use client';

/**
 * The theme preference, which lives in localStorage rather than React state.
 *
 * It outlives the page, another tab can change it, and a script in the head
 * applies it before first paint to avoid a flash of the wrong theme. That
 * makes it an external store, read through useSyncExternalStore.
 *
 * Two controls now share it — the cycling button in the header and the
 * settings sheet — so it lives here rather than inside either of them.
 */
export type Theme = 'system' | 'light' | 'dark';

export const THEMES: Theme[] = ['system', 'light', 'dark'];

export const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/** What the button is now, and what one tap will make it. */
export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  system: 'Theme follows your device. Tap for light.',
  light: 'Light theme. Tap for dark.',
  dark: 'Dark theme. Tap to follow your device.',
};

export const THEME_STORAGE_KEY = 'mahjong-theme';
const STORAGE_KEY = THEME_STORAGE_KEY;
const THEME_EVENT = 'mahjong:themechange';

export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** The server cannot know the preference, so it renders the neutral one. */
export const getThemeOnServer = (): Theme => 'system';

export function setTheme(value: Theme): void {
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
}

/** The next theme in the cycle the header button walks through. */
export function nextTheme(from: Theme): Theme {
  return THEMES[(THEMES.indexOf(from) + 1) % THEMES.length]!;
}

/**
 * Applied before paint so the page never flashes the wrong theme.
 *
 * Inlined into the document head, which is why it is a string rather than a
 * module: it has to run before React, and before the first pixel.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;
