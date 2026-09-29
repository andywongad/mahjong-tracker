'use client';

/**
 * Shown when the browser will not give the app its storage.
 *
 * Games live in this browser, so a failure here is not "no games", it is "your
 * games cannot be reached". Those must never look the same, and the difference
 * matters most to someone mid game who thinks a night's scores just vanished.
 */
export function StorageError({ error }: { error: Error }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh flex-col justify-center gap-4 px-6 py-10"
    >
      <h1 className="text-lg font-bold">Your games could not be opened</h1>

      <p className="text-sm">
        The app keeps games in this browser, and the browser would not let it
        in. Nothing has been deleted. The usual causes are private browsing,
        storage being full, or site data being blocked.
      </p>

      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        <li>If this is a private or incognito window, try a normal one.</li>
        <li>Check that site data is allowed for this address.</li>
        <li>Free some space if the device is full, then reload.</li>
      </ul>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="touch w-full rounded-xl py-3 text-base font-semibold"
        style={{ background: 'var(--tile-back)', color: '#fff' }}
      >
        Try again
      </button>

      <details className="text-xs" style={{ color: 'var(--muted)' }}>
        <summary className="touch inline-flex items-center">
          What went wrong
        </summary>
        <p className="mt-1 break-words">{error.message}</p>
      </details>
    </main>
  );
}
