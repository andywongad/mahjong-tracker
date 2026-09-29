import type { Rules } from '@/lib/rules/types';
import type { HandPattern } from '@/lib/scoring';
import { PATTERNS, PATTERNS_BY_ID, type Pattern } from './catalog';

export interface BuilderState {
  /** Chosen patterns and how many times each is counted. */
  picks: HandPattern[];
  /** Whether the hand was self drawn, which gates a couple of patterns. */
  selfDraw: boolean;
}

export interface BuilderTotal {
  /** Faan before the cap. */
  raw: number;
  /** Faan the hand will actually be saved with. */
  faan: number;
  capped: boolean;
  /** True when any chosen pattern is a limit hand. */
  isLimit: boolean;
  /** True when the total is below the table minimum. */
  belowMinimum: boolean;
}

/** Faan a pattern is worth, which for the self draw bonus comes from the rules. */
export function faanOfPattern(pattern: Pattern, rules: Rules): number {
  if (pattern.faanFromRules === 'selfDrawBonusFaan')
    return rules.selfDrawBonusFaan;
  return pattern.faan;
}

/** Patterns offered for the current rules and hand type. */
export function availablePatterns(rules: Rules, selfDraw: boolean): Pattern[] {
  return PATTERNS.filter((pattern) => {
    if (pattern.set === 'new_six' && !rules.newSix) return false;
    if (pattern.set === 'house' && !rules.sevenPairs) return false;
    if (pattern.selfDrawOnly && !selfDraw) return false;
    // A self draw bonus of zero means the pattern would add nothing.
    if (
      pattern.faanFromRules === 'selfDrawBonusFaan' &&
      rules.selfDrawBonusFaan <= 0
    ) {
      return false;
    }
    return true;
  });
}

/** Why a pattern cannot be chosen right now, or null when it can. */
export function blockedReason(
  pattern: Pattern,
  picks: HandPattern[],
): string | null {
  for (const pick of picks) {
    if (pick.id === pattern.id || pick.count <= 0) continue;
    const other = PATTERNS_BY_ID[pick.id];
    if (!other) continue;
    if (
      pattern.excludes?.includes(other.id) ||
      other.excludes?.includes(pattern.id)
    ) {
      return `Not with ${other.nameEn}`;
    }
  }
  return null;
}

/** Add, remove or change the count of a pattern, clearing anything it excludes. */
export function setPatternCount(
  picks: HandPattern[],
  id: string,
  count: number,
): HandPattern[] {
  const pattern = PATTERNS_BY_ID[id];
  if (!pattern) return picks;

  const max = pattern.stackable ?? 1;
  const next = Math.max(0, Math.min(count, max));

  // Choosing a pattern drops anything it cannot sit beside.
  const excluded = new Set(pattern.excludes ?? []);
  const kept = picks.filter((pick) => {
    if (pick.id === id) return false;
    if (next > 0 && excluded.has(pick.id)) return false;
    const other = PATTERNS_BY_ID[pick.id];
    if (next > 0 && other?.excludes?.includes(id)) return false;
    return true;
  });

  return next > 0 ? [...kept, { id, count: next }] : kept;
}

export function countOf(picks: HandPattern[], id: string): number {
  return picks.find((pick) => pick.id === id)?.count ?? 0;
}

/** Add up the chosen patterns under a set of rules. */
export function totalFor(picks: HandPattern[], rules: Rules): BuilderTotal {
  let raw = 0;
  let isLimit = false;

  for (const pick of picks) {
    const pattern = PATTERNS_BY_ID[pick.id];
    if (!pattern || pick.count <= 0) continue;
    raw += faanOfPattern(pattern, rules) * pick.count;
    if (pattern.limit) isLimit = true;
  }

  const faan = Math.min(raw, rules.faanCap);

  return {
    raw,
    faan,
    capped: raw > rules.faanCap,
    isLimit,
    belowMinimum: raw < rules.minFaan,
  };
}

/** The self draw bonus is added for the player, but can be taken back off. */
export function withSelfDrawBonus(
  picks: HandPattern[],
  rules: Rules,
  selfDraw: boolean,
): HandPattern[] {
  if (!selfDraw || rules.selfDrawBonusFaan <= 0) return picks;
  if (picks.some((pick) => pick.id === 'self_drawn')) return picks;
  // Nothing to add when a pattern already stands in for the self draw.
  if (picks.some((pick) => pick.id === 'fully_concealed_self_draw'))
    return picks;
  return [...picks, { id: 'self_drawn', count: 1 }];
}

/** Patterns grouped by faan, lowest first, for the builder list. */
export function groupedByFaan(
  patterns: Pattern[],
  rules: Rules,
): { faan: number; patterns: Pattern[] }[] {
  const groups = new Map<number, Pattern[]>();
  for (const pattern of patterns) {
    const faan = faanOfPattern(pattern, rules);
    groups.set(faan, [...(groups.get(faan) ?? []), pattern]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([faan, list]) => ({ faan, patterns: list }));
}
