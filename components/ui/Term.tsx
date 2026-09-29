'use client';

import { useGlossary } from '@/lib/glossary/GlossaryProvider';
import { TERM_BY_ID } from '@/lib/terms';

/**
 * A term that can be tapped for its definition.
 *
 * Marked with a dotted underline rather than a link colour, so a table full of
 * them still reads as a table.
 */
export function Term({
  id,
  children,
  className = '',
}: {
  id: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { define } = useGlossary();
  const entry = TERM_BY_ID[id];

  if (!entry) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => define(id)}
      className={`underline decoration-dotted underline-offset-2 ${className}`}
      style={{ textDecorationColor: 'var(--muted)' }}
      aria-label={`${entry.roman}. What this means`}
    >
      {children ?? entry.roman}
    </button>
  );
}

/**
 * A term as a column header: the characters with their English under them.
 *
 * Both come from the terms module, so a header cannot drift from the glossary.
 */
export function TermStack({
  id,
  suffix,
  align = 'end',
}: {
  id: string;
  /** Turns the gloss into "Shooter rate" or "Self pick share". */
  suffix?: string;
  align?: 'start' | 'end';
}) {
  const term = TERM_BY_ID[id];
  if (!term) return null;

  return (
    <Term id={id}>
      <span
        className={`flex flex-col leading-none ${
          align === 'end' ? 'items-end' : 'items-start'
        }`}
      >
        <span lang="zh-Hant" className="hanzi" aria-hidden="true">
          {term.zh}
        </span>
        <span className="mt-0.5 text-[0.6rem] leading-none font-normal">
          {suffix ? `${term.english} ${suffix}` : term.english}
        </span>
      </span>
    </Term>
  );
}
