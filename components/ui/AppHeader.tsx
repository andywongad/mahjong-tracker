'use client';

/**
 * The jade header that sits across the top of every screen.
 *
 * Three slots: where you came from on the left, where you are in the middle,
 * what you can do here on the right. The title is centred, which is what an
 * app bar does on a phone and what makes the two sides read as navigation
 * rather than as part of the heading.
 *
 * The sides are equal-width flex columns growing from nothing, so the middle
 * sits in the true centre whether a side holds two buttons or none. The title
 * is the only part that shrinks, because it is the only part that can be
 * truncated without losing a control.
 *
 * Buttons here are icons on a phone and icons with words from 600px up. That
 * is not a preference: four labelled pills plus a centred date measured at
 * 266px of buttons inside 288px of header at 320px wide, which leaves nothing
 * for the title. Icons fit, and the word comes back as soon as there is room
 * for it.
 */
export function AppHeader({
  title,
  subtitle,
  back,
  left,
  right,
  actions,
  onClose,
  closeLabel,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  /** Where this screen came from. Rendered as the first thing on the left. */
  back?: { onClick: () => void; label: string };
  /** Navigation, before the back button if both are given. */
  left?: React.ReactNode;
  /** What can be done on this screen. */
  right?: React.ReactNode;
  /** The older name for the right slot, kept so callers need not all change. */
  actions?: React.ReactNode;
  /** Shows a close control at the top right, for screens that sit over another. */
  onClose?: () => void;
  /** What closing does, for screen readers. An X on its own says nothing. */
  closeLabel?: string;
  /** Matches the wider column the game view uses on a desktop. */
  wide?: boolean;
}) {
  const rightSide = right ?? actions;

  return (
    <header
      className="pad-safe-top sticky top-0 z-30 px-4 pb-3"
      style={{ background: 'var(--felt)', color: 'var(--ink-on-felt)' }}
    >
      <div className={wide ? 'page-wide' : 'page-column'}>
        {/* A grid, not flex: two side tracks of 1fr are equal by definition,
          which is what puts the title in the true centre of the bar whether a
          side holds two buttons or none. Flexbox sides grow from different
          bases, which left the title up to 47px off centre. The 1fr tracks
          floor at their own content, so a button is never clipped. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {back && (
              <HeaderButton onClick={back.onClick} label={back.label}>
                <BackIcon />
              </HeaderButton>
            )}
            {left}
          </div>

          <div className="min-w-0 text-center">
            {/* 16px on a phone, which is the size a centred app bar title
              usually is, and the size that lets a date like "Aug 19, 2026"
              sit between four buttons at 320px: it needs 122px at 18px and
              108px at 16px, against the 120px the middle slot has there. */}
            <h1 className="truncate text-base leading-tight font-semibold tablet:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p
                className="truncate text-xs"
                style={{ color: 'var(--muted-on-felt)' }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-1">
            {rightSide}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel ?? 'Close'}
                className="touch -mr-2 inline-flex items-center justify-center rounded-full px-3"
                style={{ color: 'var(--ink-on-felt)' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * A small pill button for the header.
 *
 * The label is always there for a screen reader through aria-label, and shows
 * as words once the screen is wide enough to spare them. An icon alone is
 * never the only thing naming a control.
 */
export function HeaderButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  /** Said out loud always, shown as text from 600px up. */
  label: string;
  /** The icon. */
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      // Full height for the thumb, but narrower than the 44px square the
      // touch class would force: four of those left the date no room to sit
      // between them at 320px. 36x44 is still well past the 24x24 minimum.
      className="inline-flex h-11 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold tablet:px-3"
      style={{ background: 'var(--felt-soft)', color: 'var(--ink-on-felt)' }}
    >
      {children}
      <span className="hidden tablet:inline">{label}</span>
    </button>
  );
}
