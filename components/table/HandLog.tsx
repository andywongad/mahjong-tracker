'use client';

import {
  HAND_TYPE_LABELS,
  SEATS,
  type HandRow,
  type Seat,
} from '@/lib/scoring';
import type { GameRecord } from '@/lib/game/types';
import { Wind } from '@/components/ui/Wind';
import { formatSigned } from '@/components/ui/Score';
import { Term } from '@/components/ui/Term';
import { PlayerColumns } from './PlayerColumns';

/** Which glossary entry explains each way a hand can end. */
const GLOSSARY_FOR_TYPE: Record<string, string> = {
  ceot_cung: 'cheut_chung',
  zi_mo: 'zi_mo',
  zaa_wu: 'zaa_wu',
  draw: 'lau_guk',
};

/** The row's content: a button when it opens an editor, plain text when not. */
function RowBody({
  readOnly,
  onEdit,
  children,
}: {
  readOnly: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  if (readOnly) {
    return <div className="min-w-0 flex-1 py-2 text-left">{children}</div>;
  }
  return (
    <button type="button" onClick={onEdit} className="touch min-w-0 flex-1 py-2 text-left">
      {children}
    </button>
  );
}

/** A one line description of what happened in a hand. */
function describe(row: HandRow, players: GameRecord['players']): string {
  const { hand } = row;
  switch (hand.type) {
    case 'ceot_cung':
      return `${players[hand.winnerSeat]} won ${hand.faan} off ${players[hand.discarderSeat]}`;
    case 'zi_mo':
      return `${players[hand.winnerSeat]} self drew ${hand.faan}`;
    case 'zaa_wu':
      return `${players[hand.offenderSeat]} called a false win`;
    case 'draw':
      return 'Nobody won';
  }
}

/** The hand log, newest first. Tapping a hand opens it for editing. */
export function HandLog({
  rows,
  game,
  onEdit,
  footer,
  readOnly = false,
}: {
  rows: HandRow[];
  game: GameRecord;
  onEdit?: (row: HandRow) => void;
  /** A shared game is watched, not edited. */
  readOnly?: boolean;
  /** The running tally, shown as the closing row of the same card. */
  footer?: React.ReactNode;
}) {
  if (rows.length === 0) {
    // First time in a game, say how scoring works. Coming from the spreadsheet,
    // the natural instinct is to type a score against a player; here you record
    // what happened and the four scores follow from it.
    return (
      <div
        className="tile flex flex-col gap-2 px-3 py-4 text-sm"
        style={{ color: 'var(--muted)' }}
      >
        <p>No hands yet.</p>
        <p>
          You do not enter scores directly. Record how each hand ended and who
          won, pick the hand value from 3 to 13, and all four scores are worked
          out for you.
        </p>
        <p>
          A self drawn 6 pays the winner 36 and costs the other three 12 each.
          You will see the four numbers before you save.
        </p>
      </div>
    );
  }

  return (
    // One card holding the whole log, rather than a card per hand. Twenty
    // identical tiles stacked up read as noise; a single object with ruled
    // rows reads as a ledger, and leaves the real actions free to stand out.
    <div className="tile overflow-hidden">
      <PlayerColumns
        players={game.players}
        className="px-1 py-2"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
      />

      <ul>
        {[...rows].reverse().map((row, index) => {
          const label = HAND_TYPE_LABELS[row.hand.type];
          return (
            <li
              key={row.index}
              className="flex items-stretch gap-1 pr-3"
              style={index > 0 ? { borderTop: '1px solid var(--line)' } : undefined}
            >
              {/* The tag and the row are separate controls: one explains the
                term, the other opens the hand. Nesting them would be invalid. */}
              <Term
                id={GLOSSARY_FOR_TYPE[row.hand.type]}
                className="touch flex w-14 shrink-0 flex-col items-center justify-center px-1 no-underline"
              >
                <span
                  lang="zh-Hant"
                  className="hanzi text-sm leading-none"
                  aria-hidden="true"
                >
                  {label.hanzi}
                </span>
                <span
                  className="mt-0.5 text-center text-[0.55rem] leading-tight"
                  style={{ color: 'var(--muted)' }}
                >
                  {label.english}
                </span>
              </Term>

              <RowBody readOnly={readOnly} onEdit={() => onEdit?.(row)}>
                <span className="flex items-baseline gap-2">
                  <span
                    className="tnum w-4 shrink-0 text-xs font-semibold"
                    style={{ color: 'var(--muted)' }}
                  >
                    {row.handNumber}
                  </span>
                  <Wind wind={row.round} className="shrink-0 text-sm" />
                  <span className="sr-only">{label.roman}. </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {describe(row, game.players)}
                  </span>
                </span>

                <span className="mt-1 grid grid-cols-4 gap-1">
                  {SEATS.map((seat: Seat) => (
                    <span
                      key={seat}
                      className="tnum text-right text-xs font-semibold"
                      style={{
                        color:
                          row.deltas[seat] === 0
                            ? 'var(--muted)'
                            : row.deltas[seat] > 0
                              ? 'var(--gain)'
                              : 'var(--loss)',
                      }}
                    >
                      {row.deltas[seat] === 0 ? '0' : formatSigned(row.deltas[seat])}
                    </span>
                  ))}
                </span>
              </RowBody>
            </li>
          );
        })}
      </ul>

      {footer}
    </div>
  );
}
