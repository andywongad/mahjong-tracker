'use client';

import { useMemo } from 'react';
import {
  availablePatterns,
  blockedReason,
  countOf,
  faanOfPattern,
  groupedByFaan,
  setPatternCount,
} from '@/lib/patterns/builder';
import type { Pattern } from '@/lib/patterns/catalog';
import type { Rules } from '@/lib/rules/types';
import type { HandPattern } from '@/lib/scoring';

/**
 * The patterns checklist, for a player who already knows what their hand is
 * called. The other tab works the hand out from the tiles instead.
 */
export function PatternChecklist({
  rules,
  selfDraw,
  picks,
  onChange,
}: {
  rules: Rules;
  /** Whether the hand was self drawn, which gates a couple of patterns. */
  selfDraw: boolean;
  picks: HandPattern[];
  onChange: (picks: HandPattern[]) => void;
}) {
  const patterns = useMemo(
    () => availablePatterns(rules, selfDraw),
    [rules, selfDraw],
  );
  const groups = useMemo(
    () => groupedByFaan(patterns, rules),
    [patterns, rules],
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        For when you already know the hand&rsquo;s name. Patterns that cannot go
        together switch each other off.
      </p>
      {groups.map((group) => (
        <section key={group.faan} className="flex flex-col gap-2">
          <h3
            className="text-xs font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            {group.faan} faan
          </h3>
          <ul className="flex flex-col gap-2">
            {group.patterns.map((pattern) => (
              <li key={pattern.id}>
                <PatternRow
                  pattern={pattern}
                  rules={rules}
                  count={countOf(picks, pattern.id)}
                  blocked={blockedReason(pattern, picks)}
                  onChange={(count) =>
                    onChange(setPatternCount(picks, pattern.id, count))
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PatternRow({
  pattern,
  rules,
  count,
  blocked,
  onChange,
}: {
  pattern: Pattern;
  rules: Rules;
  count: number;
  blocked: string | null;
  onChange: (count: number) => void;
}) {
  const max = pattern.stackable ?? 1;
  const chosen = count > 0;
  const faan = faanOfPattern(pattern, rules);

  const name = (
    <span className="min-w-0 flex-1">
      <span className="flex items-baseline gap-1.5">
        <span lang="zh-Hant" className="hanzi text-sm" aria-hidden="true">
          {pattern.zh}
        </span>
        <span className="truncate text-sm font-semibold">{pattern.nameEn}</span>
        {pattern.limit && (
          <span
            className="rounded-full px-1.5 text-[0.6rem] font-semibold tracking-wide uppercase"
            style={{ background: 'var(--badge-bg)', color: 'var(--on-badge)' }}
          >
            Limit
          </span>
        )}
      </span>
      <span
        className="block text-xs"
        style={{ color: chosen ? 'var(--on-player-solid)' : 'var(--muted)' }}
      >
        {blocked ??
          `${pattern.jyutping} · ${faan} faan${max > 1 ? ' each' : ''}`}
      </span>
    </span>
  );

  if (max > 1) {
    return (
      <div
        className={`tile-sm flex items-center gap-3 px-3 py-2 ${blocked ? 'opacity-45' : ''}`}
      >
        {name}
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={!!blocked || count === 0}
            onClick={() => onChange(count - 1)}
            className="touch w-10 rounded-lg text-lg font-semibold"
            style={{ border: '1px solid var(--line-strong)' }}
            aria-label={`One fewer ${pattern.nameEn}`}
          >
            &minus;
          </button>
          <span className="tnum w-6 text-center text-sm font-bold">
            {count}
          </span>
          <button
            type="button"
            disabled={!!blocked || count >= max}
            onClick={() => onChange(count + 1)}
            className="touch w-10 rounded-lg text-lg font-semibold"
            style={{ border: '1px solid var(--line-strong)' }}
            aria-label={`One more ${pattern.nameEn}`}
          >
            +
          </button>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!!blocked}
      onClick={() => onChange(chosen ? 0 : 1)}
      aria-pressed={chosen}
      className={`tile-sm touch flex w-full items-center gap-3 px-3 py-2 text-left ${
        blocked ? 'opacity-45' : ''
      }`}
      style={
        chosen
          ? {
              background: 'var(--tile-back)',
              color: '#fff',
              borderColor: 'transparent',
            }
          : undefined
      }
    >
      {name}
      <span
        aria-hidden="true"
        className="grid h-5 w-5 shrink-0 place-items-center rounded"
        style={{
          background: chosen ? '#fff' : 'transparent',
          border: chosen ? 'none' : '1px solid var(--line-strong)',
          color: 'var(--tile-back)',
        }}
      >
        {chosen ? '✓' : ''}
      </span>
    </button>
  );
}
