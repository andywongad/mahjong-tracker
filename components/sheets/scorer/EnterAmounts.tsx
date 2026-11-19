'use client';

import { useState } from 'react';
import { SEATS, type Adjustment, type PlayerNames } from '@/lib/scoring';

/**
 * Four amounts typed in by hand, replacing everything the rules would say.
 *
 * The way out for a night that did something no rule here describes: a side
 * bet, a forfeit, a hand settled by argument. Behind a link in the edit view
 * only, because it is a repair rather than a way to record, and somebody
 * reaching for it has already decided the normal route is wrong.
 *
 * The running total is the whole interface. Save stays shut until it reads
 * zero, which is the one thing the engine will not bend on, and showing the
 * number as it moves is kinder than refusing at the end and not saying why.
 */
export function EnterAmounts({
  players,
  value,
  onChange,
  onCancel,
}: {
  players: PlayerNames;
  value: Adjustment | undefined;
  onChange: (adjustment: Adjustment | undefined) => void;
  onCancel: () => void;
}) {
  const [amounts, setAmounts] = useState<string[]>(() =>
    value ? value.amounts.map(String) : ['', '', '', ''],
  );
  const [note, setNote] = useState(value?.note ?? '');

  const parsed = amounts.map((raw) => {
    const n = Number(raw.trim());
    return raw.trim() === '' || Number.isNaN(n) ? 0 : Math.round(n);
  });
  const total = parsed[0] + parsed[1] + parsed[2] + parsed[3];
  const balanced = total === 0 && amounts.some((raw) => raw.trim() !== '');

  return (
    <fieldset className="mt-1 flex flex-col gap-2">
      <legend className="mb-1.5 text-base font-bold">Enter amounts</legend>

      {SEATS.map((seat) => (
        <label key={seat} className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {players[seat]}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={amounts[seat]}
            placeholder="0"
            aria-label={`Amount for ${players[seat]}`}
            onChange={(event) =>
              setAmounts((held) =>
                held.map((raw, index) =>
                  index === seat ? event.target.value : raw,
                ),
              )
            }
            className="tile-sm touch tnum w-24 shrink-0 text-center font-bold"
          />
        </label>
      ))}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Total</span>
        <span
          className="tnum w-24 shrink-0 text-center text-base font-bold"
          style={{ color: total === 0 ? 'var(--muted)' : 'var(--accent)' }}
        >
          {total}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        {total === 0
          ? 'Balanced. What one player loses, the others take.'
          : 'These have to come to zero before the hand can be saved.'}
      </p>

      <input
        type="text"
        value={note}
        placeholder="What happened, in a few words"
        aria-label="Note"
        onChange={(event) => setNote(event.target.value)}
        className="touch rounded-xl px-3 text-sm"
        style={{
          background: 'var(--tile-face)',
          border: '1px solid var(--line-strong)',
          color: 'var(--ink)',
        }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onChange(undefined);
            onCancel();
          }}
          className="touch rounded-xl px-4 text-sm font-semibold"
          style={{
            border: '1px solid var(--line-strong)',
            color: 'var(--muted)',
          }}
        >
          Back to the rules
        </button>
        <button
          type="button"
          disabled={!balanced}
          onClick={() =>
            onChange({
              amounts: [parsed[0], parsed[1], parsed[2], parsed[3]],
              note: note.trim() || undefined,
            })
          }
          className="touch flex-1 rounded-xl px-4 text-sm font-semibold"
          style={
            balanced
              ? { background: 'var(--tile-back)', color: '#fff' }
              : {
                  background: 'var(--line)',
                  color: 'var(--muted)',
                  cursor: 'not-allowed',
                }
          }
        >
          Use these amounts
        </button>
      </div>
    </fieldset>
  );
}
