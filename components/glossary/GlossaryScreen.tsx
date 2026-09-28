'use client';

import { useMemo, useState } from 'react';
import { GLOSSARY, GROUP_LABELS, type GlossaryEntry } from '@/lib/glossary/entries';
import { useGlossary } from '@/lib/glossary/GlossaryProvider';
import { useNavigation } from '@/lib/game/navigation';
import { AppHeader } from '@/components/ui/AppHeader';

const GROUP_ORDER: GlossaryEntry['group'][] = ['play', 'table', 'scoring', 'pattern'];

export function GlossaryScreen() {
  const { define } = useGlossary();
  const { go } = useNavigation();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = GLOSSARY.filter((entry) =>
      needle === ''
        ? true
        : `${entry.term} ${entry.zh} ${entry.english}`.toLowerCase().includes(needle),
    );
    return GROUP_ORDER.map((group) => ({
      group,
      entries: matches.filter((entry) => entry.group === group),
    })).filter((section) => section.entries.length > 0);
  }, [query]);

  return (
    <>
      <AppHeader
        title="Glossary"
        subtitle={`${GLOSSARY.length} terms`}
        back={{ onClick: () => go('games', null), label: 'Games' }}
      />

      <main id="main" tabIndex={-1} className="flex flex-col gap-5 px-4 py-4 pad-safe-bottom">
        <label className="flex flex-col gap-1.5">
          <span className="sr-only">Search the glossary</span>
          <input
            type="search"
            value={query}
            placeholder="Search a term"
            onChange={(event) => setQuery(event.target.value)}
            className="touch rounded-xl px-3 text-sm"
            style={{
              background: 'var(--tile-face)',
              border: '1px solid var(--line-strong)',
              color: 'var(--ink)',
            }}
          />
        </label>

        {groups.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Nothing matches that.
          </p>
        )}

        {groups.map((section) => (
          <section key={section.group} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{GROUP_LABELS[section.group]}</h2>
            <ul className="flex flex-col gap-2">
              {section.entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => define(entry.id)}
                    className="tile touch w-full px-3 py-2.5 text-left"
                  >
                    <span className="flex items-baseline gap-2">
                      <span lang="zh-Hant" className="hanzi text-base" aria-hidden="true">
                        {entry.zh}
                      </span>
                      <span className="text-sm font-semibold">{entry.term}</span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {entry.english}
                      </span>
                    </span>
                    <span
                      className="mt-0.5 block truncate text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      {entry.definition}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
