'use client';

import { useMemo, useState } from 'react';
import type { Rules } from '@/lib/rules/types';
import type { HandPattern, Seat, Wind } from '@/lib/scoring';
import { SEAT_WINDS } from '@/lib/game/seats';
import { totalFor, withSelfDrawBonus } from '@/lib/patterns/builder';
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';
import { scoreHand, type HandContext } from '@/lib/patterns/detect';
import type { BonusKey, TileKey } from '@/lib/tiles';
import { romanOf } from '@/lib/terms';
import { windLabel } from '@/components/ui/Wind';
import { WIND_CHARS } from '@/lib/scoring';
import { Sheet } from './Sheet';
import { TapTheTiles } from './scorer/TapTheTiles';
import { PatternChecklist } from './scorer/PatternChecklist';

/**
 * Work out what a hand is worth.
 *
 * Two ways in, for two kinds of player. Someone who knows their hand is a
 * Mixed One Suit picks it off a list; someone who only knows what they are
 * holding taps the tiles and is told. Both end at the same number, which goes
 * back to the record sheet as the hand's faan.
 *
 * The seat wind, the round and the deal are never asked for: the game already
 * knows them.
 */
export function HandScorerSheet({
  open,
  rules,
  winnerSeat,
  roundWind,
  dealerSeat,
  selfDraw,
  initialPatterns,
  initialTiles,
  onClose,
  onUse,
  onRecordZaaWu,
}: {
  open: boolean;
  rules: Rules;
  /** Whose hand this is, which fixes their seat wind and their flower. */
  winnerSeat: Seat | null;
  roundWind: Wind;
  dealerSeat?: Seat;
  selfDraw: boolean;
  initialPatterns?: HandPattern[];
  initialTiles?: TileKey[];
  onClose: () => void;
  onUse: (
    faan: number,
    patterns: HandPattern[],
    isLimit: boolean,
    tiles: TileKey[],
  ) => void;
  /** Offered when the hand cannot reach the table minimum. */
  onRecordZaaWu?: () => void;
}) {
  const [mode, setMode] = useState<'tiles' | 'patterns'>('tiles');
  const [tiles, setTiles] = useState<TileKey[]>(initialTiles ?? []);
  const [flowers, setFlowers] = useState<BonusKey[]>([]);
  const [picks, setPicks] = useState<HandPattern[]>(() =>
    withSelfDrawBonus(initialPatterns ?? [], rules, selfDraw),
  );

  const seat = winnerSeat ?? 0;
  const seatWind = SEAT_WINDS[seat];

  const context = useMemo<HandContext>(
    () => ({
      seatWind,
      roundWind,
      seatIndex: seat,
      flowers,
      selfDraw,
    }),
    [seatWind, roundWind, seat, flowers, selfDraw],
  );

  const scored = useMemo(
    () => scoreHand(tiles, context, rules),
    [tiles, context, rules],
  );

  const byTiles = mode === 'tiles';
  const patterns = byTiles ? scored.patterns : picks;
  const total = byTiles ? scored.total : totalFor(picks, rules);
  const ready = byTiles ? scored.complete : picks.length > 0;
  const canUse = ready && !total.belowMinimum;

  // A pattern worth nothing at this table is not a reason for anything, so it
  // is left out rather than listed as "+0".
  const reasons = patterns.filter((pick) => {
    const pattern = PATTERNS_BY_ID[pick.id];
    return pattern && (pattern.limit || faanOf(pick.id, rules) > 0);
  });

  const label = !ready
    ? byTiles
      ? 'Finish the hand'
      : 'Pick some patterns'
    : total.belowMinimum
      ? `Below the ${rules.minFaan} faan minimum`
      : `Use ${total.faan} faan`;

  return (
    <Sheet
      open={open}
      wide
      title="What is this hand worth?"
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
                  · a limit hand
                </span>
              )}
            </span>
            {(tiles.length > 0 || flowers.length > 0 || picks.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setTiles([]);
                  setFlowers([]);
                  setPicks(withSelfDrawBonus([], rules, selfDraw));
                }}
                className="text-xs underline"
                style={{ color: 'var(--muted)' }}
              >
                Clear
              </button>
            )}
          </div>

          {ready && total.belowMinimum && (
            <div
              className="flex flex-col gap-2 rounded-lg px-3 py-2"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--ink)' }}>
                Below the {rules.minFaan} faan minimum. Record as{' '}
                {romanOf('zaa_wu')} instead?
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
            disabled={!canUse}
            onClick={() => {
              onUse(total.faan, patterns, total.isLimit, byTiles ? tiles : []);
              onClose();
            }}
            className="touch w-full rounded-xl px-4 text-base font-semibold"
            style={
              canUse
                ? { background: 'var(--tile-back)', color: '#fff' }
                : {
                    background: 'var(--line)',
                    color: 'var(--muted)',
                    cursor: 'not-allowed',
                  }
            }
          >
            {label}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* The game already knows all three, so none of them is a question. */}
        <ul className="flex flex-wrap gap-1.5">
          <Fact
            zh={WIND_CHARS[seatWind]}
            text={`${windLabel(seatWind)} seat`}
          />
          <Fact
            zh={WIND_CHARS[roundWind]}
            text={`${windLabel(roundWind)} round`}
          />
          {dealerSeat !== undefined && (
            <Fact
              zh="莊"
              text={dealerSeat === seat ? 'Dealing' : 'Not dealing'}
            />
          )}
        </ul>

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
            ownFlowerNumber={seat + 1}
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

        {reasons.length > 0 && (
          <section
            className="flex flex-col gap-2 rounded-xl px-3 py-3"
            style={{
              background: 'var(--tile-face)',
              border: '1px solid var(--line-strong)',
            }}
          >
            <h3 className="text-sm font-semibold">Why it is worth this</h3>
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
                    <span className="tnum shrink-0 text-sm font-semibold">
                      {pattern.limit
                        ? 'Limit'
                        : `+${faanOf(pattern.id, rules) * pick.count}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}

/** Something the game already knows, shown so nobody is asked for it. */
function Fact({ zh, text }: { zh: string; text: string }) {
  return (
    <li
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      style={{ background: 'var(--line)', color: 'var(--ink)' }}
    >
      <span lang="zh-Hant" className="hanzi" aria-hidden="true">
        {zh}
      </span>
      {text}
    </li>
  );
}

function faanOf(id: string, rules: Rules): number {
  const pattern = PATTERNS_BY_ID[id];
  if (!pattern) return 0;
  return pattern.faanFromRules ? rules[pattern.faanFromRules] : pattern.faan;
}
