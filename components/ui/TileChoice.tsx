'use client';

/** A tile shaped choice, used for hand types, players, and point values. */
export function TileChoice({
  selected,
  disabled = false,
  onClick,
  children,
  accent,
  className = '',
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Colour to tint the selected state, for player choices. */
  accent?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`tile-sm tile-pressable touch flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center ${
        disabled ? 'opacity-40' : ''
      } ${className}`}
      style={
        selected
          ? {
              background: accent ?? 'var(--tile-back)',
              color: 'var(--on-player-solid)',
              borderColor: 'transparent',
              boxShadow: '0 2px 0 #00000040, 0 3px 8px #17211e26',
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}
