import { SEATS, type Deltas, type Hand, type Seat } from '@/lib/scoring';
import { glossOf } from '@/lib/terms';
import { formatSigned } from './Score';

/** Who paid the extra, when a hand was won off a discard. */
export function shooterSeatOf(hand: Hand | null | undefined): Seat | null {
  return hand?.type === 'ceot_cung' ? hand.discarderSeat : null;
}

/** Who took the hand. Nobody, on a draw or a false win. */
export function winnerSeatOf(hand: Hand | null | undefined): Seat | null {
  if (hand?.type === 'ceot_cung' || hand?.type === 'zi_mo') {
    return hand.winnerSeat;
  }
  return null;
}

/**
 * One player's change from one hand.
 *
 * The two players a hand turns on are filled rather than given hues of their
 * own: a win is still a gain and a loss still a loss, so the colours stay and
 * the shape is what marks them out. Keeping the colours' meaning intact also
 * means neither mark is carried by colour alone, which matters for the one man
 * in twelve who cannot separate red from green.
 */
export function DeltaCell({
  value,
  isShooter = false,
  isWinner = false,
  size = 'sm',
}: {
  value: number;
  isShooter?: boolean;
  isWinner?: boolean;
  /** Small in the hand log, larger in the preview above the save button. */
  size?: 'sm' | 'md';
}) {
  const text = size === 'sm' ? 'text-xs' : 'text-base';
  const weight = size === 'sm' ? 'font-semibold' : 'font-bold';

  if (isShooter || isWinner) {
    const shooter = isShooter;
    return (
      <span
        className={`tnum inline-flex items-center rounded px-1.5 py-0.5 ${text} ${weight}`}
        style={{
          background: shooter ? 'var(--shooter)' : 'var(--winner)',
          color: shooter ? 'var(--on-shooter)' : 'var(--on-winner)',
        }}
      >
        <span className="sr-only">
          {shooter ? `${glossOf('cheut_chung')}, ` : 'Won, '}
        </span>
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
  const winner = winnerSeatOf(hand);

  return (
    <span className={`grid grid-cols-4 gap-1 ${className}`}>
      {SEATS.map((seat: Seat) => (
        <span key={seat} className="text-right leading-none">
          <DeltaCell
            value={deltas[seat]}
            isShooter={seat === shooter}
            isWinner={seat === winner}
          />
        </span>
      ))}
    </span>
  );
}
