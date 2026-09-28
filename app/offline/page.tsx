export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold">You are offline</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Games saved on this device are still available. Anything you record now will sync
        once you are back on.
      </p>
    </main>
  );
}
