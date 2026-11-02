'use client';

/**
 * A label, a hint, and a number with a minus and a plus.
 *
 * Shared by the rules sheet and the rules walkthrough so a table setting looks
 * and behaves the same wherever it is being set. The walkthrough asks one
 * question at a time and uses `size="md"`; the rules sheet lists a dozen rows
 * and stays small.
 */
export function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  size = 'sm',
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  size?: 'sm' | 'md';
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next / step) * step));
  const labelSize = size === 'md' ? 'text-sm' : 'text-xs';

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
        <span
          className={`tnum w-12 text-center font-bold ${size === 'md' ? 'text-base' : 'text-sm'}`}
        >
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
