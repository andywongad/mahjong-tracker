'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { logEvent } from '@/lib/telemetry/events';
import {
  HAND_TYPE_LABELS,
  SEATS,
  deltas,
  faanValues,
  isCompleteHand,
  type Hand,
  type HandRow,
  type HandPattern,
  type HandType,
  type Seat,
} from '@/lib/scoring';
import type { Rules } from '@/lib/rules/types';
import type { GameRecord } from '@/lib/game/types';
import { SEAT_WINDS, seatSolid } from '@/lib/game/seats';
import { Sheet } from './Sheet';
import { HandBuilderSheet } from './HandBuilderSheet';
import { TileChoice } from '@/components/ui/TileChoice';
import { Wind } from '@/components/ui/Wind';
import { formatSigned } from '@/components/ui/Score';

/**
 * Recording starts from "this player won", so only the two ways of winning are
 * offered. A draw and a false win have no winner and live under the table
 * instead. Editing can still reach all four, because a hand recorded as the
 * wrong kind has to be correctable.
 */
const WIN_TYPES: HandType[] = ['ceot_cung', 'zi_mo'];
const ALL_TYPES: HandType[] = ['ceot_cung', 'zi_mo', 'zaa_wu', 'draw'];

interface Draft {
  type: HandType | null;
  winnerSeat: Seat | null;
  discarderSeat: Seat | null;
  offenderSeat: Seat | null;
  faan: number | null;
  isLimit?: boolean;
  patterns?: HandPattern[];
}

const EMPTY_DRAFT: Draft = {
  type: null,
  winnerSeat: null,
  discarderSeat: null,
  offenderSeat: null,
  faan: null,
};

function draftFromHand(hand: Hand): Draft {
  switch (hand.type) {
    case 'ceot_cung':
      return {
        type: 'ceot_cung',
        winnerSeat: hand.winnerSeat,
        discarderSeat: hand.discarderSeat,
        offenderSeat: null,
        faan: hand.faan,
        isLimit: hand.isLimit,
        patterns: hand.patterns,
      };
    case 'zi_mo':
      return {
        type: 'zi_mo',
        winnerSeat: hand.winnerSeat,
        discarderSeat: null,
        offenderSeat: null,
        faan: hand.faan,
        isLimit: hand.isLimit,
        patterns: hand.patterns,
      };
    case 'zaa_wu':
      return {
        ...EMPTY_DRAFT,
        type: 'zaa_wu',
        offenderSeat: hand.offenderSeat,
      };
    case 'draw':
      return { ...EMPTY_DRAFT, type: 'draw' };
  }
}

function toHand(draft: Draft, rules: Rules): Hand | null {
  if (!isCompleteHand(draft, rules)) return null;
  switch (draft.type) {
    case 'ceot_cung':
      return {
        type: 'ceot_cung',
        winnerSeat: draft.winnerSeat as Seat,
        discarderSeat: draft.discarderSeat as Seat,
        faan: draft.faan as number,
        isLimit: draft.isLimit,
        patterns: draft.patterns,
      };
    case 'zi_mo':
      return {
        type: 'zi_mo',
        winnerSeat: draft.winnerSeat as Seat,
        faan: draft.faan as number,
        isLimit: draft.isLimit,
        patterns: draft.patterns,
      };
    case 'zaa_wu':
      return { type: 'zaa_wu', offenderSeat: draft.offenderSeat as Seat };
    case 'draw':
      return { type: 'draw' };
    default:
      return null;
  }
}

export function RecordHandSheet({
  open,
  game,
  handNumber,
  dealerSeat,
  presetSeat,
  editing,
  onClose,
  onSave,
  onDelete,
  onSwitchToFalseWin,
}: {
  open: boolean;
  game: GameRecord;
  /** Hand number shown in the title, for a new hand. */
  handNumber: number;
  /** Who is dealing, so a dealer bonus previews correctly. */
  dealerSeat?: Seat;
  /** The player tapped on the table: the winner, or the offender on a false win. */
  presetSeat?: Seat | null;
  /** The hand being edited, or null when recording a new one. */
  editing: HandRow | null;
  onClose: () => void;
  onSave: (hand: Hand) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  /** Offered when a built hand cannot reach the table minimum. */
  onSwitchToFalseWin?: () => void;
}) {
  // The parent remounts this sheet whenever it opens or switches hand, so the
  // draft can start from the hand being edited without resetting in an effect.
  const [draft, setDraft] = useState<Draft>(() => {
    if (editing) return draftFromHand(editing.hand);
    // Tapping a seat on the table says who the hand is about before the sheet
    // even opens, so that step starts answered.
    return presetSeat == null
      ? EMPTY_DRAFT
      : { ...EMPTY_DRAFT, winnerSeat: presetSeat, offenderSeat: presetSeat };
  });
  const [builderOpen, setBuilderOpen] = useState(false);
  // The chosen player is settled unless the scorekeeper says otherwise.
  const [changingPlayer, setChangingPlayer] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const hand = useMemo(() => toHand(draft, game.rules), [draft, game.rules]);
  const complete = hand !== null;

  // Live preview of what the hand does to all four players.
  const preview = useMemo(() => {
    if (!hand) return null;
    try {
      return deltas(hand, game.rules, dealerSeat);
    } catch {
      return null;
    }
  }, [hand, game.rules, dealerSeat]);

  const chosenSeat =
    draft.type === 'zaa_wu' ? draft.offenderSeat : draft.winnerSeat;

  const needsWinner = draft.type === 'ceot_cung' || draft.type === 'zi_mo';
  const needsDiscarder = draft.type === 'ceot_cung';
  const needsOffender = draft.type === 'zaa_wu';
  const needsFaan = needsWinner;

  function setType(type: HandType) {
    setDraft((current) => {
      if (current.type === type) return current;
      if (type === 'ceot_cung' || type === 'zi_mo') {
        // Both are the same win by a different route, so the winner and a faan
        // that was tapped by hand survive the switch. A built hand does not:
        // its patterns were chosen for one route and may not apply to the other.
        const built = (current.patterns?.length ?? 0) > 0;
        return {
          ...EMPTY_DRAFT,
          type,
          winnerSeat: current.winnerSeat ?? presetSeat ?? null,
          faan: built ? null : current.faan,
        };
      }
      // A draw or a false win is not about a winner at all.
      const keep =
        type === 'zaa_wu' ? { offenderSeat: presetSeat ?? null } : {};
      return { ...EMPTY_DRAFT, ...keep, type };
    });
  }

  // The questions still open, in the order they are asked. The first one names
  // the step an abandoned attempt stopped at, and tells the save button what is
  // missing rather than leaving it greyed out and silent.
  const openQuestions: { key: string; missing: string }[] = [];
  if (editing) {
    if (draft.type === null) {
      openQuestions.push({ key: 'type', missing: 'Pick how the hand ended' });
    }
    if (needsWinner && draft.winnerSeat == null) {
      openQuestions.push({ key: 'winner', missing: 'Pick who won' });
    }
  } else {
    if (draft.winnerSeat == null) {
      openQuestions.push({ key: 'winner', missing: 'Pick who won' });
    }
    if (draft.type === null) {
      openQuestions.push({ key: 'type', missing: 'Pick how they won' });
    }
  }
  if (needsOffender && draft.offenderSeat == null) {
    openQuestions.push({ key: 'offender', missing: 'Pick who called it' });
  }
  if (needsDiscarder && draft.discarderSeat == null) {
    openQuestions.push({ key: 'shooter', missing: 'Pick the shooter' });
  }
  if (needsFaan && draft.faan == null) {
    openQuestions.push({ key: 'faan', missing: 'Pick faan' });
  }

  const nextQuestion = openQuestions[0] ?? null;
  const pendingStep = nextQuestion?.key ?? 'confirm';
  const saveLabel = nextQuestion
    ? nextQuestion.missing
    : editing
      ? 'Save changes'
      : `Save hand ${handNumber}`;

  // Read at unmount, when the render that set it is long gone.
  const stepRef = useRef(pendingStep);
  const settledRef = useRef(false);

  useEffect(() => {
    stepRef.current = pendingStep;
  }, [pendingStep]);

  useEffect(() => {
    if (!open || editing) return;
    logEvent('record_started');
    return () => {
      if (!settledRef.current) {
        logEvent('record_abandoned', { step: stepRef.current });
      }
    };
  }, [open, editing]);

  async function handleSave() {
    if (!hand || saving) return;
    setSaving(true);
    try {
      await onSave(hand);
      settledRef.current = true;
      logEvent(editing ? 'hand_edited' : 'record_saved', { type: hand.type });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await onDelete();
    settledRef.current = true;
    logEvent('hand_deleted');
    onClose();
  }

  const typePicker = (
    <Step label={editing ? 'How did the hand end?' : 'How did they win?'}>
      {/* Two across rather than four, so the name and its plain English reading
        both fit on one line and the targets stay large. */}
      <div className="grid grid-cols-2 gap-2">
        {(editing ? ALL_TYPES : WIN_TYPES).map((type) => {
          const label = HAND_TYPE_LABELS[type];
          const selected = draft.type === type;
          return (
            <TileChoice
              key={type}
              selected={selected}
              onClick={() => setType(type)}
              className="gap-0.5 py-2.5"
            >
              <span
                lang="zh-Hant"
                className="hanzi text-xl leading-none"
                aria-hidden="true"
              >
                {label.hanzi}
              </span>
              <span className="text-sm leading-tight font-semibold">
                {label.roman}
              </span>
              <span
                className="text-xs leading-tight"
                style={{
                  color: selected ? 'var(--on-player-solid)' : 'var(--muted)',
                }}
              >
                {type === 'ceot_cung' && !editing
                  ? 'Off a discard'
                  : label.english}
              </span>
            </TileChoice>
          );
        })}
      </div>
    </Step>
  );

  const showWinnerPicker =
    (needsWinner || (!editing && draft.type == null)) &&
    (presetSeat == null || changingPlayer || editing);

  const winnerPicker = showWinnerPicker ? (
    <Step label="Who won?">
      <SeatPicker
        game={game}
        value={draft.winnerSeat}
        onChange={(seat) =>
          setDraft((current) => ({
            ...current,
            winnerSeat: seat,
            // The winner cannot also be the shooter.
            discarderSeat:
              current.discarderSeat === seat ? null : current.discarderSeat,
          }))
        }
      />
    </Step>
  ) : null;

  return (
    <>
      <Sheet
        open={open && !builderOpen}
        title={
          editing
            ? `Edit hand ${editing.handNumber}`
            : `Record hand ${handNumber}`
        }
        onClose={onClose}
        footer={
          <div className="flex flex-col gap-2">
            {preview && (
              <div className="flex justify-between gap-2">
                {SEATS.map((seat: Seat) => (
                  <div key={seat} className="min-w-0 flex-1 text-center">
                    <p
                      className="truncate text-[0.7rem]"
                      style={{ color: 'var(--muted)' }}
                    >
                      {game.players[seat]}
                    </p>
                    <p
                      className="tnum text-base font-bold"
                      style={{
                        color:
                          preview[seat] === 0
                            ? 'var(--muted)'
                            : preview[seat] > 0
                              ? 'var(--gain)'
                              : 'var(--loss)',
                      }}
                    >
                      {preview[seat] === 0 ? '0' : formatSigned(preview[seat])}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {editing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="touch rounded-xl px-4 text-sm font-semibold"
                  style={
                    confirmingDelete
                      ? { background: 'var(--accent)', color: '#fff' }
                      : {
                          border: '1px solid var(--line-strong)',
                          color: 'var(--accent)',
                        }
                  }
                >
                  {confirmingDelete ? 'Tap again to delete' : 'Delete'}
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!complete || saving}
                className="touch flex-1 rounded-xl px-4 text-base font-semibold"
                style={
                  complete && !saving
                    ? { background: 'var(--tile-back)', color: '#fff' }
                    : {
                        background: 'var(--line)',
                        color: 'var(--muted)',
                        cursor: 'not-allowed',
                      }
                }
              >
                {saveLabel}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {presetSeat != null &&
            !editing &&
            !changingPlayer &&
            chosenSeat != null && (
              <div
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                style={{
                  background: 'var(--tile-face)',
                  border: '1px solid var(--line-strong)',
                }}
              >
                <span className="min-w-0 text-sm">
                  <span style={{ color: 'var(--muted)' }}>Won by </span>
                  <span className="font-semibold">
                    {game.players[chosenSeat]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setChangingPlayer(true)}
                  className="touch shrink-0 px-2 text-xs font-semibold underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Change
                </button>
              </div>
            )}

          {editing ? typePicker : winnerPicker}
          {editing ? winnerPicker : typePicker}

          {needsDiscarder && (
            <Step label="Who was the shooter?">
              <SeatPicker
                game={game}
                value={draft.discarderSeat}
                disabledSeat={draft.winnerSeat}
                onChange={(seat) =>
                  setDraft((current) => ({ ...current, discarderSeat: seat }))
                }
              />
            </Step>
          )}

          {needsOffender &&
            (presetSeat == null || changingPlayer || editing) && (
              <Step label="Who called it?">
                <SeatPicker
                  game={game}
                  value={draft.offenderSeat}
                  onChange={(seat) =>
                    setDraft((current) => ({ ...current, offenderSeat: seat }))
                  }
                />
              </Step>
            )}

          {needsFaan && (
            <Step
              label="How many faan?"
              action={
                <button
                  type="button"
                  onClick={() => setBuilderOpen(true)}
                  className="text-xs font-semibold underline underline-offset-2"
                  style={{ color: 'var(--accent)' }}
                >
                  Build hand
                </button>
              }
            >
              {draft.patterns && draft.patterns.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Built from {draft.patterns.length} pattern
                  {draft.patterns.length === 1 ? '' : 's'}
                  {draft.isLimit ? ', a limit hand' : ''}.
                </p>
              )}
              <div className="grid grid-cols-6 gap-2">
                {faanValues(game.rules).map((faan) => (
                  <TileChoice
                    key={faan}
                    selected={draft.faan === faan}
                    onClick={() =>
                      // Tapping a number by hand replaces anything that was built.
                      setDraft((current) => ({
                        ...current,
                        faan,
                        patterns: undefined,
                        isLimit: false,
                      }))
                    }
                  >
                    <span className="tnum text-lg font-bold leading-none">
                      {faan}
                    </span>
                  </TileChoice>
                ))}
              </div>
            </Step>
          )}

          {draft.type === 'draw' && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nothing changes on a draw. Save to move the hand count on.
            </p>
          )}

          {draft.type === 'zaa_wu' && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              The player who called it pays {game.rules.zaaWuPenalty} to each of
              the others.
            </p>
          )}
        </div>
      </Sheet>

      <HandBuilderSheet
        open={builderOpen}
        rules={game.rules}
        selfDraw={draft.type === 'zi_mo'}
        initialPatterns={draft.patterns}
        onClose={() => setBuilderOpen(false)}
        onUse={(faan, patterns, isLimit) =>
          setDraft((current) => ({ ...current, faan, patterns, isLimit }))
        }
        onRecordZaaWu={
          editing
            ? () =>
                setDraft({ ...EMPTY_DRAFT, type: 'zaa_wu', winnerSeat: null })
            : onSwitchToFalseWin
              ? () => {
                  // A false win has no winner, so it is recorded elsewhere.
                  onClose();
                  onSwitchToFalseWin();
                }
              : undefined
        }
      />
    </>
  );
}

function Step({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SeatPicker({
  game,
  value,
  disabledSeat,
  onChange,
}: {
  game: GameRecord;
  value: Seat | null;
  disabledSeat?: Seat | null;
  onChange: (seat: Seat) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SEATS.map((seat: Seat) => (
        <TileChoice
          key={seat}
          selected={value === seat}
          disabled={disabledSeat === seat}
          accent={seatSolid(seat)}
          onClick={() => onChange(seat)}
        >
          <Wind wind={SEAT_WINDS[seat]} className="text-sm leading-none" />
          <span className="w-full truncate text-xs font-semibold">
            {game.players[seat]}
          </span>
        </TileChoice>
      ))}
    </div>
  );
}
