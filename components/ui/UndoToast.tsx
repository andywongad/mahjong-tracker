'use client';

import { useEffect, useRef, useState } from 'react';

/** How long a mis-tap stays undoable, in milliseconds. */
export const UNDO_MS = 6000;

/**
 * Confirms what was just recorded and offers to take it back.
 *
 * Six seconds is long enough to notice a mis-tap and short enough that it never
 * sits in the way of the next hand. It is also why the sheet no longer needs to
 * ask twice: the way out of a mistake is here rather than in a confirmation.
 */
export function UndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string;
  onUndo: () => void | Promise<void>;
  onDismiss: () => void;
}) {
  const [undoing, setUndoing] = useState(false);
  // Held in a ref so a re-render never restarts the countdown.
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), UNDO_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        boxShadow: 'var(--shadow-sheet)',
      }}
    >
      <span className="min-w-0 text-sm">{message}</span>
      <button
        type="button"
        disabled={undoing}
        onClick={async () => {
          setUndoing(true);
          await onUndo();
        }}
        className="touch shrink-0 px-2 text-sm font-semibold underline"
        style={{ color: 'var(--accent)' }}
      >
        Undo
      </button>
    </div>
  );
}
