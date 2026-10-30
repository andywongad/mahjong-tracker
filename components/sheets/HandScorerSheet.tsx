'use client';

import { useMemo, useState } from 'react';
import type { Rules } from '@/lib/rules/types';
import type { HandPattern, Seat, Wind } from '@/lib/scoring';
import { SEAT_WINDS } from '@/lib/game/seats';
import {
  availablePatterns,
  totalFor,
  withSelfDrawBonus,
} from '@/lib/patterns/builder';
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';
import { scoreHand, type HandContext } from '@/lib/patterns/detect';
import type { BonusKey, TileKey } from '@/lib/tiles';
import { romanOf } from '@/lib/terms';
import { windLabel } from '@/components/ui/Wind';
import { WIND_CHARS } from '@/lib/scoring';
import { Sheet } from './Sheet';
import { TapTheTiles } from './scorer/TapTheTiles';
import { PatternChecklist } from './scorer/PatternChecklist';
import { HandReasons, faanOf } from './scorer/HandReasons';
import { postConfirm } from '@/lib/scan/client';

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
  // The tiles cannot show whether a set was claimed, so the player says.
  const [concealed, setConcealed] = useState(false);
  const [tiles, setTiles] = useState<TileKey[]>(initialTiles ?? []);
  // The scan this hand started from, if it started from one. Saving writes the
  // tiles the player settled on back onto it, and the difference between the
  // two is the whole measurement.
  const [scanId, setScanId] = useState<string | null>(null);
  const [flowers, setFlowers] = useState<BonusKey[]>([]);
  const [picks, setPicks] = useState<HandPattern[]>(() =>
    withSelfDrawBonus(initialPatterns ?? [], rules, selfDraw),
  );

  function clearHand() {
    setTiles([]);
    setFlowers([]);
    // Cleared by hand, so whatever was scanned is no longer what is here.
    setScanId(null);
  }

  // Offered only where the table plays it, the same as in the checklist.
  const concealable = availablePatterns(rules, selfDraw).some(
    (pattern) =>
      pattern.id === 'concealed_hand' ||
      pattern.id === 'fully_concealed_self_draw',
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
      concealed,
    }),
    [seatWind, roundWind, seat, flowers, selfDraw, concealed],
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
      // Built a tap at a time, so the hand being worked on has to stay put.
      tall
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
                  clearHand();
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
              // Best effort and never awaited: the hand is saved locally
              // either way, and the accuracy figure is not worth making
              // anyone wait for a round trip.
              if (scanId && byTiles) void postConfirm(scanId, tiles, flowers);
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

        {/* The one thing about the hand the game cannot know: a claimed set
          and a drawn one look exactly alike once they are on the table. */}
        {concealable && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={concealed}
              onChange={(event) => setConcealed(event.target.checked)}
              className="h-5 w-5"
              style={{ accentColor: 'var(--tile-back)' }}
            />
            <span>
              <span lang="zh-Hant" className="hanzi" aria-hidden="true">
                門前清
              </span>{' '}
              Concealed, nothing taken from a discard
            </span>
          </label>
        )}

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
            onClear={clearHand}
            onScanned={setScanId}
            // The tray runs past the bottom of the sheet, so tapping down it
            // would otherwise scroll the hand out of sight.
            stickyHand
          />
        ) : (
          <PatternChecklist
            rules={rules}
            selfDraw={selfDraw}
            picks={picks}
            onChange={setPicks}
          />
        )}

        {/* Always open. It was a disclosure while the sheet grew with its
          content and the list shifted everything under it; the sheet holds its
          height now and the hand is pinned, so there is nothing left to hide
          it from, and the one number the sheet exists to produce should not
          take a tap to see. */}
        {reasons.length > 0 && (
          <HandReasons
            reasons={reasons}
            rules={rules}
            total={total}
            className="flex flex-col gap-1.5 rounded-xl px-3 py-3"
            style={{
              background: 'var(--tile-face)',
              border: '1px solid var(--line-strong)',
            }}
          />
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
