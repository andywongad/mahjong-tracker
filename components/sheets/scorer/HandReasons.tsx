import type { CSSProperties } from 'react';
import type { Rules } from '@/lib/rules/types';
import type { HandPattern } from '@/lib/scoring';
import type { BuilderTotal } from '@/lib/patterns/builder';
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';

/**
 * What the hand is made of, and what it comes to.
 *
 * Both scorers show this: the one inside a game and the standalone screen. It
 * lives here so the list and its total read the same in both, rather than as
 * two copies that drift apart.
 */
export function HandReasons({
  reasons,
  rules,
  total,
  className,
  style,
}: {
  reasons: HandPattern[];
  rules: Rules;
  total: BuilderTotal;
  className?: string;
  style?: CSSProperties;
}) {
  // A cap or a limit changes what the sum means, so it is said next to the
  // number rather than leaving arithmetic that looks wrong.
  const note = total.capped
    ? `capped at ${rules.faanCap}`
    : total.isLimit
      ? 'a limit hand'
      : null;

  return (
    <ul className={className} style={style}>
      {reasons.map((pick) => {
        const pattern = PATTERNS_BY_ID[pick.id]!;
        return (
          <li
            key={pick.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span
                lang="zh-Hant"
                className="hanzi shrink-0"
                aria-hidden="true"
              >
                {pattern.zh}
              </span>
              <span className="truncate">{pattern.nameEn}</span>
              {pick.count > 1 && (
                <span
                  className="tnum shrink-0 text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  ×{pick.count}
                </span>
              )}
            </span>
            <span className="tnum shrink-0 font-semibold">
              {pattern.limit
                ? 'Limit'
                : `+${faanOf(pick.id, rules) * pick.count}`}
            </span>
          </li>
        );
      })}

      {/* The sum, in the same column as the parts that make it. */}
      <li
        className="flex items-baseline justify-between gap-3 pt-2 text-sm"
        style={{ borderTop: '1px solid var(--line-strong)' }}
      >
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="font-semibold">Total faan</span>
          {note && (
            <span
              className="truncate text-xs"
              style={{ color: 'var(--muted)' }}
            >
              {note}
            </span>
          )}
        </span>
        <span className="tnum shrink-0 text-base font-bold">{total.raw}</span>
      </li>
    </ul>
  );
}

/** Faan a pattern is worth here, which for a few comes from the rules. */
export function faanOf(id: string, rules: Rules): number {
  const pattern = PATTERNS_BY_ID[id];
  if (!pattern) return 0;
  return pattern.faanFromRules ? rules[pattern.faanFromRules] : pattern.faan;
}
