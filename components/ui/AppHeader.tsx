'use client';
import { HintAnchor, useHint } from './Hint';

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
  left,
  right,
  nav,
  actions,
  onClose,
  closeLabel,
  wide = false,
  tone = 'felt',
}: {
  title: string;
  subtitle?: string;
  /** Navigation, before the back button if both are given. */
  left?: React.ReactNode;
  /** What can be done on this screen. */
  right?: React.ReactNode;
  /**
   * A second row under the title, for moving between places rather than
   * acting on this one. Part of the sticky header, so it stays reachable
   * while a long screen scrolls.
   */
  nav?: React.ReactNode;
  /** The older name for the right slot, kept so callers need not all change. */
  actions?: React.ReactNode;
  /** Shows a close control at the top right, for screens that sit over another. */
  onClose?: () => void;
  /** What closing does, for screen readers. An X on its own says nothing. */
  closeLabel?: string;
  /** Matches the wider column the game view uses on a desktop. */
  wide?: boolean;
  /**
   * Felt or page.
   *
   * The felt is the table: it belongs on a game, where you are sitting at
   * one. Everywhere else is a screen you read, so the title sits on the page
   * at full size with nothing painted behind it.
   */
  tone?: 'felt' | 'page';
}) {
  const rightSide = right ?? actions;
  const onFelt = tone === 'felt';

  // The bar's own colours, handed down as custom properties so a header
  // button does not have to be told which kind of bar it is sitting on.
  const barTokens = onFelt
    ? {
        background: 'var(--felt)',
        color: 'var(--ink-on-felt)',
        '--bar-soft': 'var(--felt-soft)',
        '--bar-muted': 'var(--muted-on-felt)',
      }
    : {
        background: 'var(--page)',
        color: 'var(--ink)',
        '--bar-soft': 'var(--surface)',
        '--bar-muted': 'var(--muted)',
      };

  return (
    <header className="sticky top-0 z-30">
      <div
        className="pad-safe-top px-4 pb-3"
        style={barTokens as React.CSSProperties}
      >
        <div className={wide ? 'page-wide' : 'page-column'}>
          {/* One arrangement on both tones, so only the colour changes from
            screen to screen. A grid, not flex: two side tracks of 1fr are
            equal by definition, which is what puts the title in the true
            centre whether a side holds two buttons or none. Flex sides grow
            from different bases, which left it up to 47px off centre.

            The title is 16px on a phone because that is what fits between
            the buttons: the middle track is 120px wide at 320px, and
            "Aug 19, 2026" needs 122px at 18px against 108px at 16px. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">{left}</div>

            <div className="min-w-0 text-center">
              <h1 className="truncate text-base leading-tight font-semibold tablet:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p
                  className="truncate text-xs"
                  style={{ color: 'var(--bar-muted)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1">
              {rightSide}
              {onClose && <CloseButton onClose={onClose} label={closeLabel} />}
            </div>
          </div>
        </div>
      </div>

      {nav && (
        <div
          className="px-4 pb-2"
          style={{
            background: 'var(--page)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className={wide ? 'page-wide' : 'page-column'}>
            <nav aria-label="Sections" className="flex items-center gap-1.5">
              {nav}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function CloseButton({
  onClose,
  label,
}: {
  onClose: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label ?? 'Close'}
      className="touch -mr-2 inline-flex items-center justify-center rounded-full px-3"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M4 4l10 10M14 4L4 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
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
  hint,
  hintAlign,
  current = false,
  children,
}: {
  onClick: () => void;
  /** Said out loud always, shown as text from 600px up. */
  label: string;
  /**
   * What pressing it does, under the pointer and on keyboard focus. Says
   * something the label does not; a hint that repeats the name is noise.
   */
  hint?: string;
  /** Pulled to the right edge for a button near the end of the bar. */
  hintAlign?: 'center' | 'end';
  /**
   * This is the screen showing. Said through aria-current and nothing else:
   * Home and Settings are a matched pair at the two ends of the bar, and
   * filling one of them in made the pair look like two different controls.
   */
  current?: boolean;
  /** The icon. */
  children: React.ReactNode;
}) {
  const { anchorProps, targetProps, bubble } = useHint(hint, hintAlign);

  return (
    <HintAnchor {...anchorProps}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={current ? 'page' : undefined}
        {...targetProps}
        // Full height for the thumb, but narrower than the 44px square the
        // touch class would force: four of those left the date no room to sit
        // between them at 320px. 36x44 is still well past the 24x24 minimum.
        className="inline-flex h-11 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold tablet:px-3"
        style={{ background: 'var(--bar-soft)', color: 'currentColor' }}
      >
        {children}
        <span className="hidden tablet:inline">{label}</span>
      </button>
      {bubble}
    </HintAnchor>
  );
}
