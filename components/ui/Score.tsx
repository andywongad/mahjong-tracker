/** A signed score change, coloured by direction. Zero reads as neutral. */
export function Delta({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  if (value === 0) {
    return <span className={`tnum text-muted ${className}`}>0</span>;
  }
  return (
    <span
      className={`tnum font-semibold ${className}`}
      style={{ color: value > 0 ? 'var(--gain)' : 'var(--loss)' }}
    >
      {formatSigned(value)}
    </span>
  );
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
