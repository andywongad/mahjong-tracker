'use client';

/**
 * Everything you can do to a game rather than in it.
 *
 * These were scattered: Rules in the header, End game early and Delete as
 * plain links under the table, Edit only from the history list. Delete in
 * particular sat in the open on two screens, which is the wrong amount of
 * effort for the one action here that cannot be taken back by tapping again.
 *
 * Rules joins them because the header had no room for a fourth control — at
 * 390px a third icon button cost the four player names — and because Rules is
 * a setting of this game, which is what everything else in here is too. The
 * app's own Settings stays outside, alone on the right.
 */

import { useState } from 'react';
import { formatGameDate } from '@/lib/game/format';
import { Sheet } from './Sheet';

export function GameMenuSheet({
  open,
  startConfirming = false,
  date,
  handCount,
  canEndEarly,
  onClose,
  onRules,
  onEdit,
  onEndEarly,
  onDelete,
}: {
  open: boolean;
  /**
   * Opens straight on the question, for the Delete game link under the
   * table. One confirmation, asked the same way wherever it is reached
   * from, rather than a second one worded slightly differently.
   */
  startConfirming?: boolean;
  date: string;
  handCount: number;
  /** Hands have been played, and nobody has called it yet. */
  canEndEarly: boolean;
  onClose: () => void;
  onRules: () => void;
  onEdit: () => void;
  onEndEarly: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(startConfirming);
  const named = formatGameDate(date);

  // Asked afresh each time it opens, so a sheet reopened after a cancel does
  // not come back still holding the question.
  const close = () => {
    setConfirming(false);
    onClose();
  };

  return (
    <Sheet
      open={open}
      title={confirming ? 'Delete this game?' : named}
      onClose={close}
    >
      {confirming ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Delete the {named} game and its {handCount}{' '}
            {handCount === 1 ? 'hand' : 'hands'}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="touch flex-1 rounded-xl px-4 text-sm font-semibold"
              style={{
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              className="touch flex-1 rounded-xl px-4 text-sm font-semibold"
              style={{ background: 'var(--loss)', color: '#fff' }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <Action
            label="House rules"
            detail="What this table counts and what it pays"
            onClick={() => {
              close();
              onRules();
            }}
          />
          <Action
            label="Edit game"
            detail="The date and who is sitting where"
            onClick={() => {
              close();
              onEdit();
            }}
          />
          {canEndEarly && (
            <Action
              label="End game early"
              detail={`Call it after ${handCount} ${handCount === 1 ? 'hand' : 'hands'}`}
              onClick={() => {
                close();
                onEndEarly();
              }}
            />
          )}
          <Action
            label="Delete game"
            detail="Gone from this device and your account"
            destructive
            onClick={() => setConfirming(true)}
          />
        </div>
      )}
    </Sheet>
  );
}

function Action({
  label,
  detail,
  destructive = false,
  onClick,
}: {
  label: string;
  detail: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch flex w-full flex-col items-start gap-0.5 py-3 text-left"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <span
        className="text-base font-semibold"
        style={destructive ? { color: 'var(--loss)' } : undefined}
      >
        {label}
      </span>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {detail}
      </span>
    </button>
  );
}
