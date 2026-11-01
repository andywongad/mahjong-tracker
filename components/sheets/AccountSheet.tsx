'use client';

/**
 * Signing in, which is an upgrade and never a gate.
 *
 * Its own sheet rather than a corner of settings. Settings is how the app
 * looks and what language it speaks; an account is who you are, and the two
 * are not the same kind of thing. It also means one door to it rather than a
 * button beside another button that opened the same place.
 *
 * The app records hands with no account and no signal, and that does not
 * change. An account adds one thing: the same games on another device.
 */
import { useState, useSyncExternalStore } from 'react';
import { Sheet } from './Sheet';
import {
  getAccount,
  getAccountOnServer,
  sendSignInLink,
  signOut,
  subscribeAccount,
} from '@/lib/auth/session';

export function AccountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const account = useSyncExternalStore(
    subscribeAccount,
    getAccount,
    getAccountOnServer,
  );

  return (
    <Sheet
      open={open}
      title={account ? 'Your account' : 'Sign in'}
      onClose={onClose}
    >
      <AccountBody onClose={onClose} />
    </Sheet>
  );
}

/**
 * Signing in, which is an upgrade and never a gate.
 *
 * The app keeps every game on the device whether or not anyone signs in. An
 * account adds one thing: the same games on another device. The copy says
 * that plainly, because an account that looks required would put a wall in
 * front of the thing the app is for.
 *
 * A build with no Supabase project shows nothing here rather than a control
 * that cannot work.
 */
function AccountBody({ onClose }: { onClose: () => void }) {
  const account = useSyncExternalStore(
    subscribeAccount,
    getAccount,
    getAccountOnServer,
  );
  const [email, setEmail] = useState('');
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  

  if (account) {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-sm">
          Signed in as <strong>{account.email}</strong>.
        </p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Your games are on this device. Copying them to your account, so they
          follow you to another one, is being switched on next.
        </p>
        <button
          type="button"
          onClick={() => {
            void signOut();
            onClose();
          }}
          className="tile-sm tile-pressable touch self-start rounded-xl px-4 text-sm font-semibold"
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Optional, and it stays that way: the app records hands without an
        account, offline and all. An account is what will let the same games
        follow you to another device.
      </p>

      {state.kind === 'sent' ? (
        <p className="text-sm">
          Check <strong>{email}</strong> for a link to sign in. You can close
          this.
        </p>
      ) : (
        <form
          className="flex flex-col gap-2"
          // The type is kept for the keyboard it brings up on a phone, but
          // the browser's own validation is turned off: it blocks submit
          // before this handler runs, so the message people saw was the
          // browser's rather than ours, and ours never appeared at all.
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setState({ kind: 'sending' });
            void sendSignInLink(email).then((result) =>
              setState(
                result.ok
                  ? { kind: 'sent' }
                  : { kind: 'error', message: result.message },
              ),
            );
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Email address</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="touch rounded-xl px-3 text-sm"
              style={{
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
              }}
            />
          </label>
          <button
            type="submit"
            disabled={state.kind === 'sending'}
            className="touch self-start rounded-xl px-4 text-sm font-semibold"
            style={{ background: 'var(--tile-back)', color: '#fff' }}
          >
            {state.kind === 'sending' ? 'Sending…' : 'Email me a link'}
          </button>
          {state.kind === 'error' && (
            <p className="text-xs" style={{ color: 'var(--loss)' }}>
              {state.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
