'use client';
import { HintAnchor, useHint } from './Hint';

/**
 * The header that sits across the top of every screen.
 *
 * Three slots: the app's name on the left, where you are in the middle, what
 * you can do here on the right.
 *
 * The name is also the way home, which is why there is no longer a Home
 * button beside Settings. A wordmark that goes to the start is the oldest
 * convention on the web, it costs no width in a bar that had none to spare,
 * and it stops the two controls at the right reading as a matched pair when
 * only one of them is about this screen.
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
  onHome,
  right,
  nav,
  actions,
  onClose,
  closeLabel,
  wide = false,
  tone = 'felt',
}: {
  /** Where you are: the screen's name, or a game's date. */
  title: string;
  subtitle?: string;
  /**
   * Takes the name block home. Left out on home itself, where the name is
   * the page's own heading and a control that goes where you already are
   * would be a button that does nothing.
   */
  onHome?: () => void;
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
          {/* One row: the name, where you are, what you can do.
            Which of the first two is larger depends on the screen. On home
            the app is the subject and its name is the heading. Everywhere
            else the subject is this game or this screen, so the name shrinks
            to a quiet two line mark and the date takes the weight. It is
            also what makes one row possible: the name at full size left the
            four players no room and truncated them after the second. */}
          <div className="flex items-center gap-1.5">
            <Brand onHome={onHome} isHeading={!onHome} />

            <div className="min-w-0 flex-1 text-center">
              <Where
                title={title}
                subtitle={subtitle}
                isHeading={Boolean(onHome)}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {rightSide}
              {onClose && <CloseButton onClose={onClose} label={closeLabel} />}
            </div>
          </div>
        </div>
      </div>

      {nav && (
        <div
          // Page colour above the tabs, and none below: a tab's underline
          // belongs on the hairline that closes the header, which is what
          // joins the marked one to the screen under it.
          className="px-4 pt-3"
          style={{
            background: 'var(--page)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className={wide ? 'page-wide' : 'page-column'}>
            <nav aria-label="Games" className="flex items-center gap-5">
              {nav}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Where you are: a screen's name, or a game's date.
 *
 * A heading only when the name block beside it is not one, so a page always
 * has exactly one h1 whichever way round it is.
 */
function Where({
  title,
  subtitle,
  isHeading,
}: {
  title: string;
  subtitle?: string;
  isHeading: boolean;
}) {
  if (!title) return null;
  // The weight sits here rather than on the name beside it: this is what the
  // screen is about.
  const type = 'truncate text-lg leading-tight font-bold phone:text-xl';
  return (
    <>
      {isHeading ? (
        <h1 className={type}>{title}</h1>
      ) : (
        <p className={type}>{title}</p>
      )}
      {subtitle && (
        <p
          className="truncate text-xs leading-tight"
          style={{ color: 'var(--bar-muted)' }}
        >
          {subtitle}
        </p>
      )}
    </>
  );
}

/**
 * The app's name, on three lines, and the way back to the start.
 *
 * Three lines rather than one because it is a wordmark now and not a page
 * title: stacked it holds its weight at a size that leaves room for a date
 * beside it, where one long line would have taken the whole bar.
 */
function Brand({
  onHome,
  isHeading,
}: {
  onHome?: () => void;
  /** On home the name is the page's heading rather than a link to it. */
  isHeading: boolean;
}) {
  // On home the app is the subject, so the name is the heading and carries
  // the line that says what it is. Everywhere else it is a mark in the
  // corner: two lines, small, quiet, and the way back.
  if (isHeading || !onHome) {
    return (
      <h1 className="shrink-0 text-left text-lg leading-tight font-bold phone:text-xl">
        {/* One line here. Home has the width for it, and the app's name is
          this page's subject rather than a mark in a corner. */}
        <span className="block">Mahjong Tracker</span>
        <span
          className="block text-xs font-normal"
          style={{ color: 'var(--bar-muted)' }}
        >
          Hong Kong Scoring
        </span>
      </h1>
    );
  }

  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="Mahjong Tracker, back to the start"
      className="shrink-0 py-2 text-left text-xs leading-tight font-semibold"
      style={{ color: 'var(--bar-muted)' }}
    >
      <span className="block">Mahjong</span>
      <span className="block">Tracker</span>
    </button>
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
