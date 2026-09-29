'use client';

/**
 * The last resort: a failure in the root layout itself, where the app's own
 * styles and providers are not available. Deliberately plain and self
 * contained, because nothing else can be relied on here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          background: '#e4eae5',
          color: '#17211e',
          font: '16px/1.5 ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Mahjong tracker could not start</h1>
        <p style={{ margin: 0, fontSize: 14 }}>
          Your games are stored in this browser and have not been touched.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 44,
            borderRadius: 12,
            border: 0,
            background: '#1e7a5c',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Try again
        </button>
        <p style={{ margin: 0, fontSize: 12, color: '#5a6862' }}>
          {error.message}
          {error.digest ? ` (${error.digest})` : ''}
        </p>
      </body>
    </html>
  );
}
