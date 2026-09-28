import { WIND_CHARS, type Wind as WindName } from '@/lib/scoring';

/** A wind character, used for both seats and prevailing rounds. */
export function Wind({
  wind,
  className = '',
}: {
  wind: WindName;
  className?: string;
}) {
  return (
    <span className={`hanzi ${className}`} lang="zh-Hant" aria-hidden="true">
      {WIND_CHARS[wind]}
    </span>
  );
}

const WIND_NAMES: Record<WindName, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
};

export function windLabel(wind: WindName): string {
  return WIND_NAMES[wind];
}
