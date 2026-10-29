'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@/lib/game/navigation';
import { HK_STANDARD, type Rules } from '@/lib/rules/types';
import { listRuleSets, type RuleSet } from '@/lib/rules/ruleSets';
import { totalFor, withSelfDrawBonus } from '@/lib/patterns/builder';
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';
import { scoreHand, type HandContext } from '@/lib/patterns/detect';
import type { BonusKey, TileKey } from '@/lib/tiles';
import {
  WIND_CHARS,
  type HandPattern,
  type Seat,
  type Wind,
} from '@/lib/scoring';
import { AppHeader } from '@/components/ui/AppHeader';
import { windLabel } from '@/components/ui/Wind';
import { TapTheTiles } from '@/components/sheets/scorer/TapTheTiles';
import { PatternChecklist } from '@/components/sheets/scorer/PatternChecklist';
import { RulesSheet } from '@/components/sheets/RulesSheet';

const WINDS: Wind[] = ['east', 'south', 'west', 'north'];

/**
 * The hand scorer on its own, for a table that is not keeping score.
 *
 * The same two ways in as the scorer inside a game, but nothing is known about
 * the hand, so the three things that change the answer are asked for here: the
 * seat, the round, and whether the tile was drawn. Hong Kong standard unless
 * somebody says otherwise, because a table with no game has told us nothing.
 */
export function ScoreHandScreen() {
  const { go } = useNavigation();
  const [mode, setMode] = useState<'tiles' | 'patterns'>('tiles');
  const [tiles, setTiles] = useState<TileKey[]>([]);
  const [flowers, setFlowers] = useState<BonusKey[]>([]);
  const [picks, setPicks] = useState<HandPattern[]>([]);

  const [seatWind, setSeatWind] = useState<Wind>('east');
  const [roundWind, setRoundWind] = useState<Wind>('east');
  const [selfDraw, setSelfDraw] = useState(false);

  const [rules, setRules] = useState<Rules>(HK_STANDARD);
  const [ruleSetName, setRuleSetName] = useState('Hong Kong standard');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sets, setSets] = useState<RuleSet[]>([]);

  useEffect(() => {
    let cancelled = false;
    listRuleSets().then((all) => {
      if (!cancelled) setSets(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const seatIndex = WINDS.indexOf(seatWind) as Seat;

  const context = useMemo<HandContext>(
    () => ({ seatWind, roundWind, seatIndex, flowers, selfDraw }),
    [seatWind, roundWind, seatIndex, flowers, selfDraw],
  );

  const scored = useMemo(
    () => scoreHand(tiles, context, rules),
    [tiles, context, rules],
  );

  const byTiles = mode === 'tiles';
  const withDraw = useMemo(
    () => withSelfDrawBonus(picks, rules, selfDraw),
    [picks, rules, selfDraw],
  );
  const patterns = byTiles ? scored.patterns : withDraw;
  const total = byTiles ? scored.total : totalFor(withDraw, rules);
  const ready = byTiles ? scored.complete : picks.length > 0;

  const reasons = patterns.filter((pick) => {
    const pattern = PATTERNS_BY_ID[pick.id];
    return pattern && (pattern.limit || faanOf(pick.id, rules) > 0);
  });

  return (
    <>
      <AppHeader
        title="What's this hand worth?"
        subtitle={`${ruleSetName} · ${rules.minFaan} to ${rules.faanCap} faan`}
        back={{ onClick: () => go('games', null), label: 'Games' }}
      />

      <main
        id="main"
        tabIndex={-1}
        className="page-column pad-safe-bottom flex flex-col gap-4 px-4 py-4"
      >
        {/* Inside a game these three come from the game. Here nobody has told
          us, and all three change what a hand is worth. */}
        <section className="flex flex-col gap-3">
          <WindRow
            label="My seat"
            value={seatWind}
            onChange={setSeatWind}
            hint="A pung of your own wind is worth a faan"
          />
          <WindRow
            label="Round"
            value={roundWind}
            onChange={setRoundWind}
            hint="So is a pung of the round's wind"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selfDraw}
                onChange={(event) => setSelfDraw(event.target.checked)}
                className="h-5 w-5"
                style={{ accentColor: 'var(--tile-back)' }}
              />
              <span>
                <span lang="zh-Hant" className="hanzi" aria-hidden="true">
                  自摸
                </span>{' '}
                Self drawn
              </span>
            </label>

            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="touch px-2 text-xs font-semibold underline underline-offset-2"
              style={{ color: 'var(--accent)' }}
            >
              Change rules
            </button>
          </div>
        </section>

        <div
          className="grid grid-cols-2 gap-1 rounded-xl p-1"
          style={{ background: 'var(--line)' }}
          role="tablist"
          aria-label="How to work out the hand"
        >
          {(
            [
              ['tiles', 'Tap the tiles'],
              ['patterns', 'I know the patterns'],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className="touch rounded-lg px-2 text-sm font-semibold"
              style={
                mode === id
                  ? { background: 'var(--tile-face)', color: 'var(--ink)' }
                  : { color: 'var(--muted)' }
              }
            >
              {text}
            </button>
          ))}
        </div>

        {byTiles ? (
          <TapTheTiles
            tiles={tiles}
            flowers={flowers}
            scored={scored}
            ownFlowerNumber={seatIndex + 1}
            onTiles={setTiles}
            onFlowers={setFlowers}
          />
        ) : (
          <PatternChecklist
            rules={rules}
            selfDraw={selfDraw}
            picks={picks}
            onChange={setPicks}
          />
        )}

        {/* Nothing to save, so the answer is the whole point and is spelled
          out rather than folded away. */}
        <section
          className="flex flex-col gap-2 rounded-xl px-3 py-3"
          style={{
            background: 'var(--tile-face)',
            border: '1px solid var(--line-strong)',
          }}
        >
          <p className="text-base font-bold">
            {!ready
              ? byTiles
                ? 'Finish the hand to see what it is worth.'
                : 'Pick the patterns this hand has.'
              : total.isLimit
                ? `A limit hand, worth the ${rules.faanCap} faan cap.`
                : `This hand is worth ${total.faan} faan.`}
          </p>

          {ready && total.belowMinimum && (
            <p className="text-sm" style={{ color: 'var(--loss)' }}>
              Below the {rules.minFaan} faan minimum, so most tables would not
              count it as a win.
            </p>
          )}

          {reasons.length > 0 && (
            <ul className="flex flex-col gap-1.5">
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
            </ul>
          )}

          {(tiles.length > 0 || flowers.length > 0 || picks.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setTiles([]);
                setFlowers([]);
                setPicks([]);
              }}
              className="touch self-start px-1 text-xs underline"
              style={{ color: 'var(--muted)' }}
            >
              Start again
            </button>
          )}
        </section>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Nothing here is recorded. To keep score for a game, start one from
          Games.
        </p>
      </main>

      <RulesSheet
        key={rulesOpen ? `rules-${ruleSetName}` : 'rules-closed'}
        open={rulesOpen}
        rules={rules}
        ruleSetName={ruleSetName}
        handCount={0}
        onClose={() => setRulesOpen(false)}
        onApply={(next, set) => {
          setRules(next);
          setRuleSetName(
            set?.name ??
              sets.find(
                (item) => JSON.stringify(item.rules) === JSON.stringify(next),
              )?.name ??
              'Custom rules',
          );
        }}
      />
    </>
  );
}

/** One wind out of four, as the characters rather than as a dropdown. */
function WindRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: Wind;
  onChange: (wind: Wind) => void;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label={label}>
        {WINDS.map((wind) => {
          const selected = value === wind;
          return (
            <button
              key={wind}
              type="button"
              aria-pressed={selected}
              aria-label={`${label}: ${windLabel(wind)}`}
              onClick={() => onChange(wind)}
              className="touch flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5"
              style={
                selected
                  ? { background: 'var(--tile-back)', color: '#fff' }
                  : {
                      background: 'var(--tile-face)',
                      border: '1px solid var(--line-strong)',
                      color: 'var(--ink)',
                    }
              }
            >
              <span
                lang="zh-Hant"
                className="hanzi leading-none"
                aria-hidden="true"
              >
                {WIND_CHARS[wind]}
              </span>
              <span className="text-[0.7rem] leading-none">
                {windLabel(wind)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function faanOf(id: string, rules: Rules): number {
  const pattern = PATTERNS_BY_ID[id];
  if (!pattern) return 0;
  return pattern.faanFromRules ? rules[pattern.faanFromRules] : pattern.faan;
}
