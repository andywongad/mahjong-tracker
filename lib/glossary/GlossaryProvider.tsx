'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { TERM_BY_ID, type Term } from '@/lib/terms';
import { Sheet } from '@/components/sheets/Sheet';
import { TileHand } from '@/components/ui/Tile';
import { PATTERN_EXAMPLES } from '@/lib/patterns/examples';

interface GlossaryValue {
  /** Open the definition sheet for a term. */
  define: (id: string) => void;
}

const GlossaryContext = createContext<GlossaryValue | null>(null);

/**
 * One definition sheet for the whole app, so any term anywhere can be tapped
 * without every screen carrying its own copy.
 */
export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const define = useCallback((id: string) => setOpenId(id), []);
  const value = useMemo<GlossaryValue>(() => ({ define }), [define]);

  const entry = openId ? TERM_BY_ID[openId] : null;

  return (
    <GlossaryContext.Provider value={value}>
      {children}
      <Sheet
        open={entry !== null}
        title={entry ? `${entry.roman} ${entry.zh}` : ''}
        onClose={() => setOpenId(null)}
      >
        {entry && <Definition entry={entry} onFollow={setOpenId} />}
      </Sheet>
    </GlossaryContext.Provider>
  );
}

function Definition({
  entry,
  onFollow,
}: {
  entry: Term;
  onFollow: (id: string) => void;
}) {
  const related = (entry.related ?? [])
    .map((id) => TERM_BY_ID[id])
    .filter((item): item is Term => Boolean(item));

  // Patterns are shapes, and a shape is quicker to see than to read.
  const example = entry.id.startsWith('pattern:')
    ? PATTERN_EXAMPLES[entry.id.slice('pattern:'.length)]
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
        {entry.english}
      </p>
      <p className="text-sm">{entry.definition}</p>

      {example && (
        <section className="flex flex-col gap-2">
          <h3
            className="text-xs font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            For example
          </h3>
          <TileHand notation={example.hand} caption={example.note} />
        </section>
      )}

      {related.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3
            className="text-xs font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            See also
          </h3>
          <div className="flex flex-wrap gap-2">
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFollow(item.id)}
                className="tile-sm touch rounded-lg px-3 text-xs font-semibold"
              >
                {item.roman}{' '}
                <span lang="zh-Hant" className="hanzi" aria-hidden="true">
                  {item.zh}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function useGlossary(): GlossaryValue {
  const context = useContext(GlossaryContext);
  if (!context)
    throw new Error('useGlossary must be used inside GlossaryProvider');
  return context;
}
