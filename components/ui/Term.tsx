'use client';

import { useGlossary } from '@/lib/glossary/GlossaryProvider';
import { GLOSSARY_BY_ID } from '@/lib/glossary/entries';

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
  const entry = GLOSSARY_BY_ID[id];

  if (!entry) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => define(id)}
      className={`underline decoration-dotted underline-offset-2 ${className}`}
      style={{ textDecorationColor: 'var(--muted)' }}
      aria-label={`${entry.term}. What this means`}
    >
      {children ?? entry.term}
    </button>
  );
}
