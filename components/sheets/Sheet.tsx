'use client';

import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * A bottom sheet on a phone, where it sits under the thumb; a centred dialog
 * from 600px up, where the bottom edge is nowhere near the hand.
 *
 * Accessibility: it is a modal dialog, so focus moves into it on open, is kept
 * inside while it is open (WCAG 2.1.2, no keyboard trap beyond the dialog
 * itself), and returns to whatever opened it on close (2.4.3). Escape and a tap
 * on the backdrop both dismiss it.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (element) => element.offsetParent !== null || element === panel,
      );

    // Move focus into the dialog rather than leaving it behind on the page.
    (focusable()[0] ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends so Tab never escapes to the page behind.
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Hand focus back to the control that opened the sheet.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end tablet:items-center tablet:justify-center tablet:p-6">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: '#17211e73' }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pad-safe-bottom relative flex max-h-[90vh] w-full flex-col rounded-t-2xl outline-none tablet:max-h-[85vh] tablet:max-w-[35rem] tablet:rounded-2xl tablet:pb-0"
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--line)' }}
        >
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch -mr-2 inline-flex items-center px-3 text-sm"
            style={{ color: 'var(--muted)' }}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {footer && (
          <div
            className="border-t px-4 py-3"
            style={{ borderColor: 'var(--line)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
