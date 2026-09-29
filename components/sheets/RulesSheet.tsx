'use client';

import { useEffect, useMemo, useState } from 'react';
import { curvePreview } from '@/lib/rules/curve';
import {
  BUILT_IN_RULE_SETS,
  listRuleSets,
  saveRuleSet,
  deleteRuleSet,
  type RuleSet,
} from '@/lib/rules/ruleSets';
import {
  presetFor,
  withRuleChange,
  type CurveKind,
  type Rules,
} from '@/lib/rules/types';
import { Sheet } from './Sheet';
import { romanOf } from '@/lib/terms';
import { glossOf } from '@/lib/terms';

/** The three ways a table usually splits a discard win. */
/** The role word in lower case, for the middle of a sentence. */
const LOWER_SHOOTER = glossOf('cheut_chung').toLowerCase();

const DISCARD_SPLITS: {
  id: string;
  label: string;
  detail: string;
  shooter: number;
  others: number;
}[] = [
  {
    id: 'shared',
    label: `${glossOf('cheut_chung')} pays double, others pay one each`,
    detail: 'The whole table pays, the shooter pays most',
    shooter: 2,
    others: 1,
  },
  {
    id: 'shooter_only',
    label: `Only the ${LOWER_SHOOTER} pays, at double`,
    detail: `The other two pay nothing`,
    shooter: 2,
    others: 0,
  },
  {
    id: 'shooter_all',
    label: `Only the ${LOWER_SHOOTER} pays, the full amount`,
    detail: 'The shooter covers what all three would have paid',
    shooter: 4,
    others: 0,
  },
];

function splitIdFor(rules: Rules): string {
  const match = DISCARD_SPLITS.find(
    (split) =>
      split.shooter === rules.discardShooterMult &&
      split.others === rules.discardOthersMult,
  );
  return match?.id ?? 'custom';
}

export function RulesSheet({
  open,
  rules: initialRules,
  ruleSetName,
  handCount,
  onClose,
  onApply,
}: {
  open: boolean;
  rules: Rules;
  ruleSetName?: string;
  /** Hands already played, so a change can warn about recalculating. */
  handCount: number;
  onClose: () => void;
  onApply: (
    rules: Rules,
    ruleSet?: { id?: string; name?: string },
  ) => void | Promise<void>;
}) {
  const [rules, setRules] = useState<Rules>(initialRules);
  const [appliedName, setAppliedName] = useState<string | undefined>(
    ruleSetName,
  );
  const [sets, setSets] = useState<RuleSet[]>(BUILT_IN_RULE_SETS);
  const [saveName, setSaveName] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    void listRuleSets().then(setSets);
  }, [open]);

  const preview = useMemo(() => curvePreview(rules), [rules]);
  const changed = useMemo(
    () => JSON.stringify(rules) !== JSON.stringify(initialRules),
    [rules, initialRules],
  );

  function edit(change: Partial<Rules>) {
    setRules((current) => withRuleChange(current, change));
    setAppliedName(undefined);
    setConfirming(false);
  }

  function applySet(set: RuleSet) {
    setRules(set.rules);
    setAppliedName(set.name);
    setConfirming(false);
  }

  async function apply() {
    // Changing rules recalculates every hand already played, so say so first.
    if (handCount > 0 && changed && !confirming) {
      setConfirming(true);
      return;
    }
    await onApply(rules, { name: appliedName });
    onClose();
  }

  const activeSetId = sets.find(
    (set) => JSON.stringify(set.rules) === JSON.stringify(rules),
  )?.id;

  return (
    <Sheet
      open={open}
      title="House rules"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {confirming && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--accent)',
                color: 'var(--ink)',
              }}
              role="alert"
            >
              Changing rules will recalculate all {handCount}{' '}
              {handCount === 1 ? 'hand' : 'hands'}. The faan you recorded stays
              as it is, only the points change. Tap Apply again to go ahead.
            </p>
          )}
          <button
            type="button"
            onClick={apply}
            className="touch w-full rounded-xl px-4 text-base font-semibold"
            style={{
              background: confirming ? 'var(--accent)' : 'var(--tile-back)',
              color: '#fff',
            }}
          >
            {confirming ? `Recalculate ${handCount} hands` : 'Apply rules'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Rule set">
          <div className="flex flex-col gap-2">
            {sets.map((set) => (
              <div key={set.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => applySet(set)}
                  aria-pressed={activeSetId === set.id}
                  className="tile-sm touch flex-1 px-3 py-2 text-left"
                  style={
                    activeSetId === set.id
                      ? {
                          background: 'var(--tile-back)',
                          color: '#fff',
                          borderColor: 'transparent',
                        }
                      : undefined
                  }
                >
                  <span className="block text-sm font-semibold">
                    {set.name}
                  </span>
                  <span
                    className="block text-xs"
                    style={{
                      color: activeSetId === set.id ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {describeSet(set.rules)}
                  </span>
                </button>
                {!set.builtIn && (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteRuleSet(set.id);
                      setSets(await listRuleSets());
                    }}
                    className="touch rounded-lg px-3 text-xs"
                    style={{ color: 'var(--accent)' }}
                    aria-label={`Delete ${set.name}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
          {presetFor(rules) === 'custom' && !activeSetId && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              These are custom rules. Save them below to reuse them in another
              game.
            </p>
          )}
        </Section>

        <Section title="Adjust">
          <NumberRow
            label="Minimum faan to win"
            hint="Hands below this cannot be saved as a win"
            value={rules.minFaan}
            min={0}
            max={rules.faanCap}
            onChange={(minFaan) => edit({ minFaan })}
          />
          <NumberRow
            label="Faan cap"
            hint="Faan above this is paid at this level"
            value={rules.faanCap}
            min={Math.max(1, rules.minFaan)}
            max={30}
            onChange={(faanCap) => edit({ faanCap })}
          />

          <Field label="Payout curve">
            <div className="grid grid-cols-3 gap-2">
              {(['linear', 'doubling', 'custom'] as CurveKind[]).map(
                (curve) => (
                  <button
                    key={curve}
                    type="button"
                    onClick={() => edit({ curve })}
                    aria-pressed={rules.curve === curve}
                    className="tile-sm touch px-2 text-xs font-semibold capitalize"
                    style={
                      rules.curve === curve
                        ? {
                            background: 'var(--tile-back)',
                            color: '#fff',
                            borderColor: 'transparent',
                          }
                        : undefined
                    }
                  >
                    {curve}
                  </button>
                ),
              )}
            </div>
          </Field>

          <Field label="On a discard win, who pays?">
            <div className="flex flex-col gap-2">
              {DISCARD_SPLITS.map((split) => (
                <button
                  key={split.id}
                  type="button"
                  onClick={() =>
                    edit({
                      discardShooterMult: split.shooter,
                      discardOthersMult: split.others,
                    })
                  }
                  aria-pressed={splitIdFor(rules) === split.id}
                  className="tile-sm touch px-3 py-2 text-left"
                  style={
                    splitIdFor(rules) === split.id
                      ? {
                          background: 'var(--tile-back)',
                          color: '#fff',
                          borderColor: 'transparent',
                        }
                      : undefined
                  }
                >
                  <span className="block text-xs font-semibold">
                    {split.label}
                  </span>
                  <span
                    className="block text-xs"
                    style={{
                      color:
                        splitIdFor(rules) === split.id
                          ? '#fff'
                          : 'var(--muted)',
                    }}
                  >
                    {split.detail}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <ToggleRow
            label="Limit hands pay the full cap"
            hint={limitHint(rules)}
            checked={rules.limitPaysCap}
            onChange={(limitPaysCap) => edit({ limitPaysCap })}
          />

          <NumberRow
            label="Dealer bonus"
            hint="Any payment to or from the dealer is multiplied by this. 1 turns it off"
            value={rules.dealerMult}
            min={1}
            max={3}
            step={0.5}
            onChange={(dealerMult) => edit({ dealerMult })}
          />

          <NumberRow
            label={`${romanOf('zaa_wu')} penalty`}
            hint={`Paid to each other player, so ${rules.zaaWuPenalty * 3} in total`}
            value={rules.zaaWuPenalty}
            min={0}
            max={9999}
            onChange={(zaaWuPenalty) => edit({ zaaWuPenalty })}
          />

          <NumberRow
            label="Money per point"
            hint={
              rules.baseUnit
                ? `A 24 point hand is worth ${rules.currency}${(24 * rules.baseUnit).toFixed(2)}, at ${rules.currency}${rules.baseUnit.toFixed(2)} a point`
                : 'Set to 0 to keep money out of it'
            }
            value={rules.baseUnit}
            min={0}
            max={100}
            step={0.05}
            onChange={(baseUnit) => edit({ baseUnit })}
          />
        </Section>

        <Section title="What that pays">
          <div className="tile-sm overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Payouts by faan under the current rules
              </caption>
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th
                    scope="col"
                    className="px-2 py-1.5 text-left font-semibold"
                  >
                    Faan
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-1.5 text-right font-semibold"
                  >
                    {glossOf('cheut_chung')}
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-1.5 text-right font-semibold"
                  >
                    Others
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-1.5 text-right font-semibold"
                  >
                    Self draw
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-1.5 text-right font-semibold"
                  >
                    Winner
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={row.faan}
                    style={{ borderTop: '1px solid var(--line)' }}
                  >
                    <th
                      scope="row"
                      className="tnum px-2 py-1.5 text-left font-semibold"
                    >
                      {row.faan}
                    </th>
                    <td className="tnum px-2 py-1.5 text-right">
                      {row.shooter}
                    </td>
                    <td className="tnum px-2 py-1.5 text-right">
                      {row.others}
                    </td>
                    <td className="tnum px-2 py-1.5 text-right">
                      {row.selfDrawEach}
                    </td>
                    <td className="tnum px-2 py-1.5 text-right font-semibold">
                      {row.discardWin} / {row.selfDrawWin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Winner shows what a discard win pays, then a self drawn win.
          </p>
        </Section>

        <Section title="Save these rules">
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              placeholder="Name, such as Friday night"
              onChange={(event) => setSaveName(event.target.value)}
              aria-label="Name for this rule set"
              className="touch min-w-0 flex-1 rounded-xl px-3 text-sm"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
              }}
            />
            <button
              type="button"
              disabled={saveName.trim() === ''}
              onClick={async () => {
                const set = await saveRuleSet(saveName, rules);
                setSets(await listRuleSets());
                setAppliedName(set.name);
                setSaveName('');
              }}
              className="touch rounded-xl px-4 text-sm font-semibold"
              style={
                saveName.trim()
                  ? { background: 'var(--tile-back)', color: '#fff' }
                  : { background: 'var(--line)', color: 'var(--muted)' }
              }
            >
              Save
            </button>
          </div>
        </Section>
      </div>
    </Sheet>
  );
}

function limitHint(rules: Rules): string {
  const cap = rules.faanCap;
  return rules.limitPaysCap
    ? `On: a limit hand worth 8 faan still pays at ${cap} faan`
    : `Off: a limit hand worth 8 faan pays at 8 faan`;
}

function describeSet(rules: Rules): string {
  const curve =
    rules.curve === 'linear'
      ? 'Linear'
      : rules.curve === 'doubling'
        ? 'Doubling'
        : 'Custom';
  const split =
    rules.discardOthersMult === 0
      ? 'only the shooter pays'
      : rules.discardShooterMult > rules.discardOthersMult
        ? 'everyone pays, shooter more'
        : 'everyone pays the same';
  return `${curve}, ${rules.minFaan} to ${rules.faanCap} faan · On a discard, ${split}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-semibold">{label}</legend>
      {children}
    </fieldset>
  );
}

function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next / step) * step));

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{label}</span>
        {hint && (
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>
            {hint}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          className="tile-sm touch w-11 text-lg font-semibold"
          aria-label={`Decrease ${label}`}
        >
          &minus;
        </button>
        <span className="tnum w-12 text-center text-sm font-bold">
          {Number.isInteger(value) ? value : value.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          className="tile-sm touch w-11 text-lg font-semibold"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="touch flex items-center justify-between gap-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{label}</span>
        {hint && (
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>
            {hint}
          </span>
        )}
      </span>
      <span
        className="relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{
          background: checked ? 'var(--tile-back)' : 'var(--line-strong)',
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: checked ? 22 : 2 }}
        />
      </span>
    </button>
  );
}
