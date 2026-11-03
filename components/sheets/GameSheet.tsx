'use client';

import { useState } from 'react';
import { SEATS, WIND_CHARS, type PlayerNames, type Seat } from '@/lib/scoring';
import { HK_STANDARD, presetFor, type Rules } from '@/lib/rules/types';
import { RulesSheet } from './RulesSheet';
import { formatStake } from '@/lib/game/settle';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { todayIso } from '@/lib/game/ids';
import { formatGameDate } from '@/lib/game/format';
import { windLabel } from '@/components/ui/Wind';
import type { GameRecord, NewGameInput } from '@/lib/game/types';
import { Sheet } from './Sheet';

/**
 * New game, or edit an existing one. Names are entered by starting seat and
 * prefilled from the last game, since the group mostly keeps the same four.
 */
export function GameSheet({
  open,
  editing,
  lastPlayers,
  lastRules,
  lastRuleSetName,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  editing: GameRecord | null;
  /** Names from the most recent game, used to prefill a new one. */
  lastPlayers?: PlayerNames;
  /** Rules from the most recent game: a table rarely changes them between games. */
  lastRules?: Rules;
  lastRuleSetName?: string;
  onClose: () => void;
  onSave: (input: NewGameInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  // The parent remounts this sheet when it opens, so the fields can start from
  // the game being edited, or from the last game's names for a new one.
  const [date, setDate] = useState(() => editing?.date ?? todayIso());
  /**
   * Empty for a new game, even when the last group is known.
   *
   * Prefilled names look like a decision already taken, and the commonest
   * mistake they cause is starting a game under somebody else's name because
   * nobody read four fields that were already full. The last group is offered
   * below instead, as one tap.
   */
  const [names, setNames] = useState<string[]>(() =>
    editing ? [...editing.players] : ['', '', '', ''],
  );
  // A table that has played before keeps playing the same way. A table that has
  // not gets Hong Kong standard rather than somebody else's house rules, which
  // would quietly give them the wrong scores.
  const [rules, setRules] = useState<Rules>(
    () => editing?.rules ?? lastRules ?? HK_STANDARD,
  );
  const [ruleSetName, setRuleSetName] = useState(
    editing?.ruleSetName ??
      (lastRules ? lastRuleSetName : 'Hong Kong standard'),
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  // The date picker stays folded away until somebody says the date is wrong.
  const [datingOpen, setDatingOpen] = useState(false);


  const namesOk = names.every((name) => name.trim() !== '');
  // Once somebody has started typing, offering to fill the fields in for
  // them is an offer to throw away what they just wrote.
  const namesTouched = names.some((name) => name !== '');
  const complete = namesOk && date !== '';

  async function save() {
    if (!complete) return;
    await onSave({
      date,
      players: names.map((name) => name.trim()) as unknown as PlayerNames,
      rules,
      ruleSetName,
      ruleSetId: editing?.ruleSetId,
    });
    onClose();
  }

  // No second tap. Deleting a game offers it straight back afterwards, so
  // the way out of a mis-tap is undo rather than a question asked first.
  async function remove() {
    if (!onDelete) return;
    await onDelete();
    onClose();
  }

  return (
    <>
      <Sheet
        open={open && !rulesOpen}
        title={editing ? 'Game settings' : 'Start a game'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            {editing && onDelete && (
              <button
                type="button"
                onClick={remove}
                className="touch rounded-xl px-4 text-sm font-semibold"
                style={{
                  border: '1px solid var(--line-strong)',
                  color: 'var(--accent)',
                }}
              >
                Delete game
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!complete}
              className="touch flex-1 rounded-xl px-4 text-base font-semibold"
              style={
                complete
                  ? { background: 'var(--tile-back)', color: '#fff' }
                  : {
                      background: 'var(--line)',
                      color: 'var(--muted)',
                      cursor: 'not-allowed',
                    }
              }
            >
              {editing ? 'Save changes' : 'Start game'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {editing && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
                color: 'var(--muted)',
              }}
            >
              This is for the date, players and penalty. To record a hand, close
              this and tap whoever won.
            </p>
          )}


          {/* Players first. It is the only part nobody can skip, and the
            part a table is holding in its head when it opens this. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">
              Players by starting seat
            </legend>
            {SEATS.map((seat: Seat) => (
              <label key={seat} className="flex items-center gap-2">
                <span
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none"
                  style={{
                    background: seatSolid(seat),
                    color: 'var(--on-player-solid)',
                  }}
                >
                  <span
                    lang="zh-Hant"
                    className="hanzi text-base"
                    aria-hidden="true"
                  >
                    {WIND_CHARS[SEAT_WINDS[seat]]}
                  </span>
                  <span className="mt-0.5 text-[0.55rem] leading-none">
                    {windLabel(SEAT_WINDS[seat])}
                  </span>
                </span>
                <input
                  type="text"
                  value={names[seat]}
                  placeholder={`${windLabel(SEAT_WINDS[seat])}${seat === 0 ? ', deals first' : ''}`}
                  onChange={(event) =>
                    setNames((current) =>
                      current.map((name, index) =>
                        index === seat ? event.target.value : name,
                      ),
                    )
                  }
                  className="touch min-w-0 flex-1 rounded-xl px-3"
                  style={{
                    background: 'var(--tile-face)',
                    border: '1px solid var(--line-strong)',
                    color: 'var(--ink)',
                  }}
                />
              </label>
            ))}
          </fieldset>

          {/* The last group, offered rather than assumed. */}
          {!editing && lastPlayers && !namesTouched && (
            <button
              type="button"
              onClick={() => setNames([...lastPlayers])}
              className="tile-sm touch self-start px-3 py-2 text-sm font-semibold"
            >
              Use last group: {lastPlayers.join(', ')}
            </button>
          )}

          {/* One row, and a way to change it. The rules used to be a heading
            with a card under it, which made a question out of something that
            is already answered for nine tables in ten. */}
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {ruleSetLabel(rules, ruleSetName)}
                {presetFor(rules) === 'hk_standard' && (
                  <span
                    className="font-normal"
                    style={{ color: 'var(--muted)' }}
                  >
                    {' '}
                    (recommended)
                  </span>
                )}
              </span>
              <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                {rulesSummary(rules)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              aria-label={`Change the house rules, currently ${ruleSetLabel(rules, ruleSetName)}`}
              className="touch shrink-0 px-2 text-sm font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Change
            </button>
          </div>

          {/* Last, and quiet: it is right almost every time, and the times
            it is not are somebody writing up last night's game. */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Date: {date === todayIso() ? 'Today' : formatGameDate(date)}
            </span>
            {datingOpen ? (
              <input
                type="date"
                value={date}
                autoFocus
                onChange={(event) => setDate(event.target.value)}
                aria-label="Date"
                className="touch shrink-0 rounded-xl px-2 text-sm"
                style={{
                  background: 'var(--tile-face)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--ink)',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setDatingOpen(true)}
                aria-label="Change the date"
                className="touch shrink-0 px-2 text-sm font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                Change
              </button>
            )}
          </div>
        </div>
      </Sheet>

      <RulesSheet
        open={open && rulesOpen}
        rules={rules}
        ruleSetName={ruleSetName}
        handCount={editing?.hands.length ?? 0}
        onClose={() => setRulesOpen(false)}
        onApply={(next, set) => {
          setRules(next);
          setRuleSetName(set?.name);
        }}
      />
    </>
  );
}

/** What the rules cost, in one line, without naming a single setting. */
function rulesSummary(rules: Rules): string {
  const money = rules.baseUnit
    ? `, ${formatStake(rules.baseUnit, rules.currency)} a point`
    : '';
  return `${rules.minFaan} to ${rules.faanCap} faan${money}`;
}

/** What to call the current rules in a one line summary. */
function ruleSetLabel(rules: Rules, savedName?: string): string {
  if (savedName) return savedName;
  const preset = presetFor(rules);
  if (preset === 'our_table') return 'Everyone pays';
  if (preset === 'hk_standard') return 'Hong Kong standard';
  return 'Custom rules';
}
