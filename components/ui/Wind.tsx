import { WIND_CHARS, type Wind as WindName } from '@/lib/scoring';

const WIND_NAMES: Record<WindName, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
};

export function windLabel(wind: WindName): string {
  return WIND_NAMES[wind];
}

/**
 * A wind character, used for both seats and prevailing rounds.
 *
 * With `label`, the English sits under the character, so the app can be read by
 * someone who does not read the characters.
 */
export function Wind({
  wind,
  className = '',
  label = false,
  labelClassName = '',
}: {
  wind: WindName;
  className?: string;
  label?: boolean;
  labelClassName?: string;
}) {
  if (!label) {
    return (
      <>
        <span
          className={`hanzi ${className}`}
          lang="zh-Hant"
          aria-hidden="true"
        >
          {WIND_CHARS[wind]}
        </span>
        <span className="sr-only">{WIND_NAMES[wind]}</span>
      </>
    );
  }

  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`hanzi ${className}`} lang="zh-Hant" aria-hidden="true">
        {WIND_CHARS[wind]}
      </span>
      <span
        className={`mt-0.5 text-[0.55rem] leading-none ${labelClassName}`}
        style={labelClassName ? undefined : { color: 'var(--muted)' }}
      >
        {WIND_NAMES[wind]}
      </span>
    </span>
  );
}
