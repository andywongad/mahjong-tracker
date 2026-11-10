'use client';

import { useState } from 'react';

/**
 * A label, a hint, and a number with a minus and a plus.
 *
 * Shared by the rules sheet and the rules walkthrough so a table setting looks
 * and behaves the same wherever it is being set. Both ask for `size="md"`: a
 * row here is a setting, the same rank as a toggle or a question with options
 * beside it, and the small size left the rules sheet with four levels of text
 * inside two points of each other. `sm` is kept for a denser list than either
 * of them has yet.
 */
export function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  size = 'sm',
  typeable = false,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  size?: 'sm' | 'md';
  /**
   * Let the number be typed as well as stepped. For a row whose value runs
   * into the hundreds, where reaching it a tap at a time is not a control so
   * much as a punishment: 13 to 384 is 371 taps.
   */
  typeable?: boolean;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next / step) * step));
  const labelSize = size === 'md' ? 'text-sm' : 'text-xs';
  const valueSize = size === 'md' ? 'text-base' : 'text-sm';

  /**
   * What is in the box while it is being typed in, which is not a number yet.
   * Held as the raw string so that clearing the field to type a new value
   * does not read as zero and snap to the minimum mid-keystroke; null means
   * nobody is typing and the box simply shows the value.
   */
  const [typing, setTyping] = useState<string | null>(null);

  function commit() {
    if (typing === null) return;
    const parsed = Number(typing.trim());
    if (typing.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed));
    setTyping(null);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${labelSize}`}>{label}</span>
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
        {typeable ? (
          <input
            type="text"
            inputMode="numeric"
            value={typing ?? String(value)}
            aria-label={label}
            onChange={(event) => setTyping(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commit();
                event.currentTarget.blur();
              }
              if (event.key === 'Escape') setTyping(null);
            }}
            className={`tile-sm touch tnum w-20 text-center font-bold ${valueSize}`}
          />
        ) : (
          <span className={`tnum w-12 text-center font-bold ${valueSize}`}>
            {Number.isInteger(value) ? value : value.toFixed(2)}
          </span>
        )}
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
