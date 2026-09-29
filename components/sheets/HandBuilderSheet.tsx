'use client';

import { useMemo, useState } from 'react';
import {
  availablePatterns,
  blockedReason,
  countOf,
  faanOfPattern,
  groupedByFaan,
  setPatternCount,
  totalFor,
  withSelfDrawBonus,
} from '@/lib/patterns/builder';
import type { Pattern } from '@/lib/patterns/catalog';
import type { Rules } from '@/lib/rules/types';
import type { HandPattern } from '@/lib/scoring';
import { Sheet } from './Sheet';
import { romanOf } from '@/lib/terms';

/**
 * Build a hand from its patterns instead of tapping a faan number.
 *
 * The quick chips stay the default; this is for when nobody can agree what the
 * hand was worth.
 */
export function HandBuilderSheet({
  open,
  rules,
  selfDraw,
  initialPatterns,
  onClose,
  onUse,
  onRecordZaaWu,
}: {
  open: boolean;
  rules: Rules;
  /** Whether the hand was self drawn, which gates a couple of patterns. */
  selfDraw: boolean;
  initialPatterns?: HandPattern[];
  onClose: () => void;
  onUse: (faan: number, patterns: HandPattern[], isLimit: boolean) => void;
  /** Offered when the hand cannot reach the table minimum. */
  onRecordZaaWu?: () => void;
}) {
  const [picks, setPicks] = useState<HandPattern[]>(() =>
    withSelfDrawBonus(initialPatterns ?? [], rules, selfDraw),
  );

  const patterns = useMemo(
    () => availablePatterns(rules, selfDraw),
    [rules, selfDraw],
  );
  const groups = useMemo(
    () => groupedByFaan(patterns, rules),
    [patterns, rules],
  );
  const total = useMemo(() => totalFor(picks, rules), [picks, rules]);

  function change(id: string, count: number) {
    setPicks((current) => setPatternCount(current, id, count));
  }

  return (
    <Sheet
      open={open}
      title="Build hand"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">
              {total.raw} faan
              {total.capped && (
                <span className="font-normal" style={{ color: 'var(--muted)' }}>
                  {' '}
                  · capped at {rules.faanCap}
                </span>
              )}
              {total.isLimit && (
                <span className="font-normal" style={{ color: 'var(--muted)' }}>
                  {' '}
                  · limit hand
                </span>
              )}
            </span>
            {picks.length > 0 && (
              <button
                type="button"
                onClick={() => setPicks([])}
                className="text-xs underline"
                style={{ color: 'var(--muted)' }}
              >
                Clear
              </button>
            )}
          </div>

          {total.belowMinimum && picks.length > 0 && (
            <div
              className="flex flex-col gap-2 rounded-lg px-3 py-2"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--ink)' }}>
                Below the {rules.minFaan} faan minimum. Record as{' '}
                {romanOf('zaa_wu')}
                instead?
              </p>
              {onRecordZaaWu && (
                <button
                  type="button"
                  onClick={() => {
                    onRecordZaaWu();
                    onClose();
                  }}
                  className="touch rounded-lg px-3 text-xs font-semibold"
                  style={{
                    background: 'var(--badge-bg)',
                    color: 'var(--on-badge)',
                  }}
                >
                  Switch to {romanOf('zaa_wu')}
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={total.belowMinimum}
            onClick={() => {
              onUse(total.faan, picks, total.isLimit);
              onClose();
            }}
            className="touch w-full rounded-xl px-4 text-base font-semibold"
            style={
              total.belowMinimum
                ? {
                    background: 'var(--line)',
                    color: 'var(--muted)',
                    cursor: 'not-allowed',
                  }
                : { background: 'var(--tile-back)', color: '#fff' }
            }
          >
            Use {total.faan} faan
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
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
                    onChange={(count) => change(pattern.id, count)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
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
