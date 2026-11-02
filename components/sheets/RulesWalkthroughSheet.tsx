'use client';

/**
 * Picking house rules for a table that has never used the app.
 *
 * The rules sheet exposes every setting the engine has, which is right for a
 * table that knows what it wants and wrong for somebody opening the app for
 * the first time. This asks the four questions that actually move money,
 * leaves the rest on the preset's defaults, and quotes what each answer costs
 * instead of naming it: "pays the winner 48, all of it from the shooter"
 * rather than "doubling curve, shooter multiplier 2".
 *
 * Every step has a default already chosen and a way past it, and the last card
 * says the whole thing is reversible — which it is, because a game's scores
 * are replayed from its hand list, so changing a rule mid-game recalculates
 * what is already there.
 */

import { useState } from 'react';
import { curvePreview, unitFor, type CurveRow } from '@/lib/rules/curve';
import { DISCARD_SPLITS, splitIdFor } from '@/lib/rules/discardSplits';
import { saveRuleSet } from '@/lib/rules/ruleSets';
import {
  HK_STANDARD,
  OUR_TABLE,
  presetFor,
  withRuleChange,
  type CurveKind,
  type Rules,
} from '@/lib/rules/types';
import { NumberRow } from '@/components/ui/NumberRow';
import { formatStake } from '@/lib/game/settle';
import { glossOf } from '@/lib/terms';
import { Sheet } from './Sheet';

/** The role word in lower case, for the middle of a sentence. */
const LOWER_SHOOTER = glossOf('cheut_chung').toLowerCase();

/** What money per point starts at once a table says they are playing for it. */
const DEFAULT_STAKE = 0.1;

/** The four questions, then the card that shows what they added up to. */
const STEPS = ['split', 'curve', 'range', 'money', 'done'] as const;
type Step = (typeof STEPS)[number];

const CURVES: { kind: CurveKind; name: string; detail: string }[] = [
  {
    kind: 'doubling',
    name: 'Doubling',
    detail: 'Each faan is worth about double the one before it',
  },
  {
    kind: 'linear',
    name: 'Straight',
    detail: 'Every faan is worth the same, so a hand pays its own faan',
  },
];

/** The built in way to play that a curve and a split together describe. */
function matchingPreset(rules: Rules): Rules | undefined {
  return [HK_STANDARD, OUR_TABLE].find(
    (preset) =>
      preset.curve === rules.curve &&
      preset.discardShooterMult === rules.discardShooterMult &&
      preset.discardOthersMult === rules.discardOthersMult,
  );
}

/**
 * Answer one of the two payout questions.
 *
 * When the curve and the split together describe a known way to play, the
 * table gets that way to play whole — its self draw, its false win penalty,
 * which patterns the hand builder offers. Otherwise the answers stand on
 * their own and only the false win penalty follows, because that rule is
 * written as "it costs a limit hand" and a limit hand is a different number
 * on a different curve.
 */
function withPayout(current: Rules, change: Partial<Rules>): Rules {
  const next = withRuleChange(current, change);
  const preset = matchingPreset(next);
  if (preset) {
    return withRuleChange(preset, {
      minFaan: next.minFaan,
      faanCap: next.faanCap,
      baseUnit: next.baseUnit,
      currency: next.currency,
    });
  }
  return withRuleChange(next, { zaaWuPenalty: unitFor(next.faanCap, next) });
}

export function RulesWalkthroughSheet({
  open,
  rules: initialRules,
  onClose,
  onApply,
}: {
  open: boolean;
  /** Where to start: whatever the new game is currently set to. */
  rules: Rules;
  onClose: () => void;
  onApply: (
    rules: Rules,
    ruleSet?: { id?: string; name?: string },
  ) => void | Promise<void>;
}) {
  const [rules, setRules] = useState<Rules>(initialRules);
  const [step, setStep] = useState<Step>('split');
  // What the table calls its own way of playing, when the answers have added
  // up to something no preset covers.
  const [name, setName] = useState('');

  const index = STEPS.indexOf(step);

  function edit(change: Partial<Rules>) {
    setRules((current) => withRuleChange(current, change));
  }

  /** What these rules are called: a preset's own name, or the table's. */
  const preset = builtInName(rules);
  const named = preset ?? name.trim();

  async function finish() {
    // A name is worth keeping: it goes on the game, and into the list of rule
    // sets so the next game can pick it without answering anything again. If
    // storage refuses it the game still gets the name — only the reuse does
    // not, which is the lesser of the two.
    if (!preset && name.trim()) {
      try {
        await saveRuleSet(name, rules);
      } catch {
        /* The game keeps the name either way. */
      }
    }
    await onApply(rules, { name: named || undefined });
    onClose();
  }

  return (
    <Sheet
      open={open}
      title="Pick the rules"
      onClose={onClose}
      // Cards of unequal height, answered a tap at a time. Letting the panel
      // follow each one would move the question out from under the thumb
      // between steps.
      tall
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setStep(STEPS[index - 1])}
                className="touch rounded-xl px-4 text-sm font-semibold"
                style={{
                  border: '1px solid var(--line-strong)',
                  color: 'var(--ink)',
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                step === 'done' ? void finish() : setStep(STEPS[index + 1])
              }
              className="touch flex-1 rounded-xl px-4 text-base font-semibold"
              style={{ background: 'var(--tile-back)', color: '#fff' }}
            >
              {step === 'done' ? 'Use these rules' : 'Next'}
            </button>
          </div>
          {step !== 'done' && (
            <button
              type="button"
              onClick={() => setStep('done')}
              className="touch w-full rounded-xl text-xs font-semibold"
              style={{ color: 'var(--muted)' }}
            >
              Skip the rest and keep the usual
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {step !== 'done' && (
          <p
            className="text-xs font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            Question {index + 1} of {STEPS.length - 1}
          </p>
        )}

        {step === 'split' && (
          <Question
            title="On a discard win, who pays?"
            lead={`The thing tables most often play differently. Whoever discarded the winning tile is the ${LOWER_SHOOTER}.`}
          >
            <div className="flex flex-col gap-2">
              {DISCARD_SPLITS.map((split) => (
                <Card
                  key={split.id}
                  chosen={splitIdFor(rules) === split.id}
                  onClick={() =>
                    setRules((current) =>
                      withPayout(current, {
                        discardShooterMult: split.shooter,
                        discardOthersMult: split.others,
                      }),
                    )
                  }
                  label={split.label}
                  detail={split.detail}
                  consequence={payoutLine(
                    withPayout(rules, {
                      discardShooterMult: split.shooter,
                      discardOthersMult: split.others,
                    }),
                  )}
                />
              ))}
            </div>
          </Question>
        )}

        {step === 'curve' && (
          <Question
            title="How much more is a better hand worth?"
            lead="The other half of the money. Most Hong Kong tables double."
          >
            <div className="flex flex-col gap-2">
              {CURVES.map((curve) => (
                <Card
                  key={curve.kind}
                  chosen={rules.curve === curve.kind}
                  onClick={() =>
                    setRules((current) =>
                      withPayout(current, { curve: curve.kind }),
                    )
                  }
                  label={curve.name}
                  detail={curve.detail}
                  consequence={payoutLine(
                    withPayout(rules, { curve: curve.kind }),
                  )}
                />
              ))}
            </div>
          </Question>
        )}

        {step === 'range' && (
          <Question
            title="How low and how high?"
            lead="Most Hong Kong tables play 3 to 13. If that sounds like yours, there is nothing to do here."
          >
            <div className="flex flex-col gap-4">
              <NumberRow
                size="md"
                label="Lowest hand you can win with"
                hint="A hand worth less than this cannot be claimed"
                value={rules.minFaan}
                min={0}
                max={rules.faanCap}
                onChange={(minFaan) => edit({ minFaan })}
              />
              <NumberRow
                size="md"
                label="Most a hand can pay"
                hint="Anything better than this pays the same as this"
                value={rules.faanCap}
                min={Math.max(1, rules.minFaan)}
                max={30}
                onChange={(faanCap) => edit({ faanCap })}
              />
            </div>
            <Consequence rules={rules} />
          </Question>
        )}

        {step === 'money' && (
          <Question
            title="Playing for money?"
            lead="Either way the app keeps the score in points. Money only adds what each player owes to the tally at the end."
          >
            <div className="flex flex-col gap-2">
              <Card
                chosen={!rules.baseUnit}
                onClick={() => edit({ baseUnit: 0 })}
                label="Just the score"
                detail="The tally stays in points"
              />
              <Card
                chosen={Boolean(rules.baseUnit)}
                onClick={() =>
                  edit({ baseUnit: rules.baseUnit || DEFAULT_STAKE })
                }
                label="Money too"
                detail="Set what a point is worth and the tally adds it up"
              />
            </div>
            {Boolean(rules.baseUnit) && (
              <NumberRow
                size="md"
                label="Money per point"
                hint={`So far, ${formatStake(rules.baseUnit, rules.currency)} a point`}
                value={rules.baseUnit}
                min={0}
                max={100}
                step={0.05}
                onChange={(baseUnit) => edit({ baseUnit })}
              />
            )}
            <Consequence rules={rules} />
          </Question>
        )}

        {step === 'done' && (
          <Question
            title="That is the table set"
            lead="Four answers is enough to keep score. Everything else is on its usual setting."
          >
            <div className="tile-sm flex flex-col gap-1.5 px-3 py-3">
              <span className="text-sm font-semibold">
                {named || 'Your own rules'}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {rules.minFaan} to {rules.faanCap} faan
                {rules.baseUnit
                  ? `, ${formatStake(rules.baseUnit, rules.currency)} a point`
                  : ', no money'}
              </span>
              <span className="text-xs font-semibold">{payoutLine(rules)}</span>
              {moneyLine(rules) && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {moneyLine(rules)}
                </span>
              )}
            </div>
            {/* Only when the answers have left the presets behind. A set
              that still matches Hong Kong standard is already called
              something, and asking it to be renamed would be a question
              with no wrong answer and no point. */}
            {!preset && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">
                  Give these rules a name
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Optional. Named rules are kept, so the next game can start
                  from them without answering any of this again.
                </span>
                <input
                  type="text"
                  value={name}
                  placeholder="Such as Friday night"
                  onChange={(event) => setName(event.target.value)}
                  // Its own name, so it is not read out as the heading and
                  // the explanation run together.
                  aria-label="Give these rules a name"
                  className="touch rounded-xl px-3 text-sm"
                  style={{
                    background: 'var(--tile-face)',
                    border: '1px solid var(--line-strong)',
                    color: 'var(--ink)',
                  }}
                />
              </label>
            )}

            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              None of this is final. Change any of it from Rules, even
              mid-game: the faan you recorded stays as it is and every hand is
              worked out again.
            </p>
          </Question>
        )}
      </div>
    </Sheet>
  );
}

/** One question, its one line of why, and whatever answers it takes. */
function Question({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg leading-tight font-bold">{title}</h3>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        {lead}
      </p>
      {children}
    </section>
  );
}

/** One answer: what it is called, what it means, and what it costs. */
function Card({
  chosen,
  onClick,
  label,
  detail,
  consequence,
}: {
  chosen: boolean;
  onClick: () => void;
  label: string;
  detail: string;
  consequence?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chosen}
      className="tile-sm touch flex flex-col gap-1 px-3 py-2.5 text-left"
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
      <span className="text-sm font-semibold">{label}</span>
      <span
        className="text-xs"
        style={{ color: chosen ? '#fff' : 'var(--muted)' }}
      >
        {detail}
      </span>
      {consequence && (
        <span
          className="text-xs font-semibold"
          style={{ color: chosen ? '#fff' : 'var(--ink)' }}
        >
          {consequence}
        </span>
      )}
    </button>
  );
}

/** What the answers so far cost, under the question that just changed them. */
function Consequence({ rules }: { rules: Rules }) {
  const money = moneyLine(rules);
  return (
    <p className="text-xs" style={{ color: 'var(--muted)' }}>
      <span className="font-semibold" style={{ color: 'var(--ink)' }}>
        {payoutLine(rules)}
      </span>
      {money ? ` ${money}` : ''}
    </p>
  );
}

/**
 * A middling hand to quote. Nobody learns anything from what a 13 faan hand
 * pays, because nobody wins one; 5 faan is a hand people actually get.
 */
function exampleRow(rules: Rules): CurveRow {
  const rows = curvePreview(rules);
  const target = 5;
  return rows.reduce(
    (best, row) =>
      Math.abs(row.faan - target) < Math.abs(best.faan - target) ? row : best,
    rows[0],
  );
}

/** The one sentence that says what a set of rules is like to play under. */
function payoutLine(rules: Rules): string {
  const row = exampleRow(rules);
  const from =
    row.others > 0
      ? `${row.shooter} from the ${LOWER_SHOOTER} and ${row.others} from each of the other two`
      : `all of it from the ${LOWER_SHOOTER}`;
  return `A ${row.faan} faan hand off a discard pays the winner ${row.discardWin}: ${from}.`;
}

/** The same hand in money, when the table is playing for any. */
function moneyLine(rules: Rules): string | null {
  if (!rules.baseUnit) return null;
  const row = exampleRow(rules);
  const amount = (row.discardWin * rules.baseUnit).toFixed(2);
  return `At ${formatStake(rules.baseUnit, rules.currency)} a point, that is ${rules.currency}${amount}.`;
}

/** The name of the built-in set these rules match, if they still match one. */
function builtInName(rules: Rules): string | undefined {
  const preset = presetFor(rules);
  if (preset === 'hk_standard') return 'Hong Kong standard';
  if (preset === 'our_table') return 'Everyone pays';
  return undefined;
}
