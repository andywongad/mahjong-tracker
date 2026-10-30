import { SEATS, type Deltas, type Hand, type Seat } from '@/lib/scoring';
import { glossOf } from '@/lib/terms';
import { formatSigned } from './Score';

/**
 * What a player was to a hand, where that is worth marking.
 *
 * Three roles, three chips: the one who fed it, and the one who took it by
 * either route. Everyone else is a plain number.
 */
export type DeltaMark = 'shooter' | 'won' | 'self-pick';

const MARK_STYLE: Record<DeltaMark, { background: string; color: string }> = {
  shooter: { background: 'var(--shooter)', color: 'var(--on-shooter)' },
  won: { background: 'var(--winner)', color: 'var(--on-winner)' },
  'self-pick': { background: 'var(--self-pick)', color: 'var(--on-self-pick)' },
};

/** What a mark is called, for anyone who cannot see which colour it is. */
function markLabel(mark: DeltaMark): string {
  if (mark === 'shooter') return glossOf('cheut_chung');
  if (mark === 'self-pick') return glossOf('zi_mo');
  return 'Won';
}

/** What one hand did to one player, and what that player was to it. */
export function markFor(
  hand: Hand | null | undefined,
  seat: Seat,
): DeltaMark | null {
  if (!hand) return null;
  if (hand.type === 'ceot_cung') {
    if (seat === hand.winnerSeat) return 'won';
    if (seat === hand.discarderSeat) return 'shooter';
    return null;
  }
  if (hand.type === 'zi_mo' && seat === hand.winnerSeat) return 'self-pick';
  return null;
}

/**
 * One player's change from one hand.
 *
 * The players a hand turns on are filled rather than given hues that fight
 * the numbers: the colour of a chip says what that player was to the hand,
 * while the sign and the colour of every unmarked number still say gain or
 * loss. No mark is carried by colour alone, which matters for the one man in
 * twelve who cannot separate red from green.
 */
export function DeltaCell({
  value,
  mark = null,
  size = 'sm',
}: {
  value: number;
  mark?: DeltaMark | null;
  /** Small in the hand log, larger in the preview above the save button. */
  size?: 'sm' | 'md';
}) {
  const text = size === 'sm' ? 'text-xs' : 'text-base';
  const weight = size === 'sm' ? 'font-semibold' : 'font-bold';

  if (mark) {
    return (
      <span
        className={`tnum inline-flex items-center rounded px-1.5 py-0.5 ${text} ${weight}`}
        style={MARK_STYLE[mark]}
      >
        <span className="sr-only">{markLabel(mark)}, </span>
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
  return (
    <span className={`grid grid-cols-4 gap-1 ${className}`}>
      {SEATS.map((seat: Seat) => (
        <span key={seat} className="text-right leading-none">
          <DeltaCell value={deltas[seat]} mark={markFor(hand, seat)} />
        </span>
      ))}
    </span>
  );
}
