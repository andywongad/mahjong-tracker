'use client';

/**
 * A short line saying what a button does, shown under the pointer.
 *
 * Not the native title attribute, for two reasons. It never appears on
 * keyboard focus, so anyone navigating by tab gets nothing; and it waits about
 * a second, which is long enough that people have moved on. This shows at once
 * and on focus as well as hover.
 *
 * A hint says what the button does, never what it is called. Repeating a label
 * the person can already read is noise, so a button whose name says everything
 * gets no hint at all.
 *
 * Accessibility: role="tooltip" tied to the button with aria-describedby, so
 * it is read after the name rather than instead of it. Escape dismisses it,
 * and it never takes the pointer, which together are what WCAG 1.4.13 asks of
 * content shown on hover. Coarse pointers never open it: there is no hover on
 * a phone, and a tap would only flash it on the way to pressing the button.
 */
import { useEffect, useId, useState } from 'react';

export interface HintTarget {
  /**
   * Goes on the box around the button, not the button.
   *
   * The box is the whole control as far as the pointer is concerned, and it
   * keeps seeing the pointer when the button inside it is disabled, so a
   * button that cannot be pressed can still say why. Focus is the other half
   * and does belong on the button, which is why the two are separate.
   */
  anchorProps: {
    onPointerEnter?: (event: React.PointerEvent) => void;
    onPointerLeave?: () => void;
  };
  /** Goes on the button itself. */
  targetProps: {
    'aria-describedby'?: string;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: () => void;
  };
  bubble: React.ReactNode;
}

export function useHint(text?: string, align: 'center' | 'end' = 'center'): HintTarget {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!text) return { anchorProps: {}, targetProps: {}, bubble: null };

  return {
    anchorProps: {
      onPointerEnter: (event) => {
        // A pen or a finger is not hovering, it is on its way to a press.
        if (event.pointerType === 'mouse') setOpen(true);
      },
      onPointerLeave: () => setOpen(false),
    },
    targetProps: {
      'aria-describedby': open ? id : undefined,
      onFocus: (event) => {
        // Only for the keyboard. A click focuses too, and a hint that appears
        // after every click is in the way.
        if (event.target.matches(':focus-visible')) setOpen(true);
      },
      onBlur: () => setOpen(false),
    },
    bubble: open ? (
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute top-full z-40 mt-1.5 w-max max-w-[min(15rem,calc(100vw-2rem))] rounded-lg px-2.5 py-1.5 text-xs leading-snug font-normal ${
          align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
        }`}
        style={{
          background: 'var(--ink)',
          color: 'var(--page)',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        {text}
      </span>
    ) : null,
  };
}

/**
 * The box a hinted button sits in, which the bubble is positioned against.
 *
 * Its own layout is nothing: it takes the width of what it wraps, so a button
 * that filled its row still does.
 */
export function HintAnchor({
  children,
  className = '',
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & HintTarget['anchorProps']) {
  return (
    <span className={`relative inline-flex ${className}`} {...rest}>
      {children}
    </span>
  );
}
