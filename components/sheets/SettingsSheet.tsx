'use client';

/**
 * Settings: how the app looks, and one day what language it speaks.
 *
 * This replaces the cycling button that used to sit in the header. One
 * control is better than two that set the same thing, and a cycle could only
 * ever say what the next tap would do; three labelled choices say what they
 * all do. It is also the home the colour and language work will land in.
 *
 * The language options that are not built yet are shown as unavailable rather
 * than left out. They are properly disabled and labelled "Coming soon", so a
 * tap does nothing visible by design and a screen reader says so too: the
 * failure to avoid is an option that looks live and silently does nothing.
 */
import { useSyncExternalStore } from 'react';
import { Sheet } from './Sheet';
import { ThemeIcon } from '@/components/ui/ThemeIcon';
import {
  getTheme,
  getThemeOnServer,
  setTheme,
  subscribeTheme,
  THEME_LABELS,
  THEMES,
  type Theme,
} from '@/lib/ui/theme';

/**
 * What the app does with Chinese and English.
 *
 * Hybrid is what it does today, everywhere: the characters with their reading
 * beside them. The rest are named here so the shape of the setting is settled
 * before any of it is built.
 */
const LANGUAGES = [
  {
    id: 'hybrid',
    label: 'Hybrid',
    note: 'Characters with English beside them',
    sample: { zh: '出銃', en: 'Shooter' },
    ready: true,
  },
  {
    id: 'english',
    label: 'English only',
    note: 'No characters',
    sample: { zh: null, en: 'Shooter' },
    ready: false,
  },
  {
    id: 'chinese',
    label: 'Chinese only',
    note: 'Characters alone',
    sample: { zh: '出銃', en: null },
    ready: false,
  },
  {
    id: 'custom',
    label: 'Personalisation',
    note: 'Your table’s own words for things',
    sample: null,
    ready: false,
  },
] as const;

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    getThemeOnServer,
  );

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm font-semibold">Appearance</legend>
          <div
            role="radiogroup"
            aria-label="Appearance"
            className="grid grid-cols-3 gap-1 rounded-xl p-1"
            style={{ background: 'var(--line)' }}
          >
            {THEMES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => setTheme(option)}
                className="touch flex flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold"
                style={
                  theme === option
                    ? { background: 'var(--tile-face)', color: 'var(--ink)' }
                    : { color: 'var(--muted)' }
                }
              >
                <ThemeIcon theme={option as Theme} />
                {THEME_LABELS[option]}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {theme === 'system'
              ? 'Following your device, so it changes when your device does.'
              : `Always ${THEME_LABELS[theme].toLowerCase()}, whatever your device does.`}
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm font-semibold">Language</legend>
          <ul role="radiogroup" aria-label="Language" className="flex flex-col gap-1.5">
            {LANGUAGES.map((language) => (
              <li key={language.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={language.ready}
                  // Disabled and said out loud, rather than quietly inert: an
                  // option that looks live and does nothing reads as broken.
                  disabled={!language.ready}
                  aria-disabled={!language.ready}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
                  style={
                    language.ready
                      ? {
                          background: 'var(--tile-face)',
                          border: '2px solid var(--tile-back)',
                        }
                      : {
                          border: '1px solid var(--line)',
                          color: 'var(--muted)',
                          cursor: 'not-allowed',
                        }
                  }
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">
                      {language.label}
                    </span>
                    <span
                      className="truncate text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      {language.sample ? (
                        <>
                          {language.sample.zh && (
                            <span lang="zh-Hant" className="hanzi">
                              {language.sample.zh}
                            </span>
                          )}
                          {language.sample.zh && language.sample.en && ' '}
                          {language.sample.en}
                        </>
                      ) : (
                        language.note
                      )}
                    </span>
                  </span>
                  {language.ready ? (
                    <span
                      className="shrink-0 text-xs font-semibold"
                      style={{ color: 'var(--tile-back)' }}
                    >
                      In use
                    </span>
                  ) : (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold"
                      style={{ background: 'var(--line)', color: 'var(--muted)' }}
                    >
                      Coming soon
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Tile faces keep their characters whichever is chosen. Those are the
            tiles themselves, not words about them.
          </p>
        </fieldset>

        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Colours</h3>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Coming soon. For now the table is jade green, and every colour in
            the app is checked for contrast against both themes.
          </p>
        </section>
      </div>
    </Sheet>
  );
}
