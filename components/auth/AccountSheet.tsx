'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { Sheet } from '@/components/sheets/Sheet';

/**
 * Signing in, for the scorekeeper who wants the group to see the game.
 *
 * Deliberately not a gate. The app works entirely without this, so the copy
 * says what an account adds rather than demanding one.
 */
export function AccountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session, email, signIn, signOut, available } = useAuth();
  const [address, setAddress] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (busy || address.trim() === '') return;
    setBusy(true);
    setError(null);
    try {
      await signIn(address);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title={session ? 'Account' : 'Sign in'} onClose={onClose}>
      {!available && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          This copy of the app has no server configured, so there is nothing to
          sign in to. Games are kept on this device.
        </p>
      )}

      {available && session && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Signed in as <span className="font-semibold">{email}</span>.
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Games stay on this device as well, so nothing is lost if you sign out
            or lose signal.
          </p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              onClose();
            }}
            className="touch w-full rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--accent)' }}
          >
            Sign out
          </button>
        </div>
      )}

      {available && !session && !sent && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Signing in lets your games sync and lets you share a live link with
            the table. The app works without it; everything is kept on this
            device either way.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="you@example.com"
              className="touch rounded-xl px-3"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              We send a link. There is no password to remember.
            </span>
          </label>

          {error && (
            <p className="text-xs" style={{ color: 'var(--accent)' }} role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={send}
            disabled={busy || address.trim() === ''}
            className="touch w-full rounded-xl px-4 py-3 text-base font-semibold"
            style={
              busy || address.trim() === ''
                ? { background: 'var(--line)', color: 'var(--muted)' }
                : { background: 'var(--tile-back)', color: '#fff' }
            }
          >
            {busy ? 'Sending' : 'Send me a link'}
          </button>
        </div>
      )}

      {available && !session && sent && (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-sm">
            Check <span className="font-semibold">{address}</span> for a link.
            Opening it on this device signs you in here.
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            The link only works once, and it expires. If it does not arrive,
            check spam or try again.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="touch w-full rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
          >
            Use a different address
          </button>
        </div>
      )}
    </Sheet>
  );
}
