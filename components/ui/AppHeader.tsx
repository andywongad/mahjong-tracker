'use client';

/** The jade header that sits across the top of every screen. */
export function AppHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: string;
  back?: { onClick: () => void; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header
      className="pad-safe-top sticky top-0 z-30 px-4 pb-3"
      style={{ background: 'var(--felt)', color: 'var(--ink-on-felt)' }}
    >
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="mb-1 inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--muted-on-felt)' }}
        >
          <span aria-hidden="true">&larr;</span> {back.label}
        </button>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg leading-tight font-semibold">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs" style={{ color: 'var(--muted-on-felt)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A small pill button, used for header actions. */
export function HeaderButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch inline-flex items-center rounded-full px-3 text-xs font-semibold"
      style={{ background: 'var(--felt-soft)', color: 'var(--ink-on-felt)' }}
    >
      {children}
    </button>
  );
}
