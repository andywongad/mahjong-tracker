'use client';

import { useGlossary } from '@/lib/glossary/GlossaryProvider';
import { TERM_BY_ID } from '@/lib/terms';

/**
 * A term that can be tapped for its definition.
 *
 * Marked with a dotted underline rather than a link colour, so a table full of
 * them still reads as a table.
 *
 * Declared as an inline target. WCAG 2.5.8 exempts one whose size is held by
 * the line height of the text around it, which is exactly this: a term is a
 * run of words inside a heading or a sentence, and a 44px tall one would
 * push the heading apart to make room for itself. The exemption is written
 * here, at the point where somebody can see it is true, rather than guessed
 * at by the floors spec from how the thing happens to be styled.
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
      data-inline-target="true"
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
