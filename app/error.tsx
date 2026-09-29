'use client';

/**
 * Catches a render failure anywhere in the app.
 *
 * Someone hitting this is at a table with a phone and no way to inspect
 * anything, so it says what is safe (the games are untouched) and offers the
 * one action worth trying.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-lg font-bold">Something went wrong</h1>

      <p className="text-sm">
        The screen failed to load. Your games are stored in this browser and have
        not been touched.
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="touch w-full rounded-xl py-3 text-base font-semibold"
          style={{ background: 'var(--tile-back)', color: '#fff' }}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            // A full load on purpose. This boundary exists because client state
            // is broken, and routing back through it could fail the same way.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/';
          }}
          className="touch w-full rounded-xl py-3 text-sm font-semibold"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
        >
          Back to the table
        </button>
      </div>

      <details className="text-xs" style={{ color: 'var(--muted)' }}>
        <summary className="touch inline-flex items-center">What went wrong</summary>
        <p className="mt-1 break-words">
          {error.message}
          {error.digest ? ` (${error.digest})` : ''}
        </p>
      </details>
    </main>
  );
}
