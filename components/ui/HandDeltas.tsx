import { SEATS, type Deltas, type Hand, type Seat } from '@/lib/scoring';
import { glossOf } from '@/lib/terms';
import { formatSigned } from './Score';

/** Who paid the extra, when a hand was won off a discard. */
export function shooterSeatOf(hand: Hand | null | undefined): Seat | null {
  return hand?.type === 'ceot_cung' ? hand.discarderSeat : null;
}

/**
 * One player's change from one hand.
 *
 * The shooter's payment is filled rather than given a hue of its own: a loss is
 * still a loss, so red stays red and the shape is what marks it out. Keeping
 * the colour's meaning intact also means the mark is never carried by colour
 * alone, which matters for the one man in twelve who cannot separate red from
 * green.
 */
export function DeltaCell({
  value,
  isShooter = false,
  size = 'sm',
}: {
  value: number;
  isShooter?: boolean;
  /** Small in the hand log, larger in the preview above the save button. */
  size?: 'sm' | 'md';
}) {
  const text = size === 'sm' ? 'text-xs' : 'text-base';
  const weight = size === 'sm' ? 'font-semibold' : 'font-bold';

  if (isShooter) {
    return (
      <span
        className={`tnum inline-flex items-center rounded px-1.5 py-0.5 ${text} ${weight}`}
        style={{ background: 'var(--shooter)', color: 'var(--on-shooter)' }}
      >
        <span className="sr-only">{glossOf('cheut_chung')}, </span>
        {formatSigned(value)}
      </span>
    );
  }

  return (
    <span
      className={`tnum px-1.5 py-0.5 ${text} ${weight}`}
      style={{
        color:
          value === 0
            ? 'var(--muted)'
            : value > 0
              ? 'var(--gain)'
              : 'var(--loss)',
      }}
    >
      {value === 0 ? '0' : formatSigned(value)}
    </span>
  );
}

/**
 * What one hand did to all four players, in seat order, aligned to the columns
 * above the log. One component for the log and the preview, so what you see
 * before you save a hand is what you see after.
 */
export function HandDeltas({
  hand,
  deltas,
  className = '',
}: {
  /** Null while a hand is still being filled in. */
  hand: Hand | null;
  deltas: Deltas;
  className?: string;
}) {
  const shooter = shooterSeatOf(hand);

  return (
    <span className={`grid grid-cols-4 gap-1 ${className}`}>
      {SEATS.map((seat: Seat) => (
        <span key={seat} className="text-right leading-none">
          <DeltaCell value={deltas[seat]} isShooter={seat === shooter} />
        </span>
      ))}
    </span>
  );
}
