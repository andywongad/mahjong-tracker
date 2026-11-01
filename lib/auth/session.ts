'use client';

/**
 * Who is signed in, if anyone.
 *
 * Signing in is an upgrade, never a gate. The app records hands with no
 * account and no signal, and that does not change: an account only adds the
 * copy of your games that follows you to another device. Everything here has
 * to cope with there being no account, and with there being no backend at
 * all — a build with no Supabase project still has to work.
 *
 * The session lives outside React, so it is read through useSyncExternalStore
 * the same way the theme is. Supabase owns the truth; this mirrors it.
 */
import { hasBackend, supabase } from '@/lib/supabase/client';

export interface Account {
  id: string;
  email: string;
}

let current: Account | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Take the session's word for who this is.
 *
 * Returns the same object when nothing has changed, because
 * useSyncExternalStore compares snapshots by identity and a fresh object
 * every read would spin.
 */
function adopt(session: { user?: { id: string; email?: string } } | null) {
  const next = session?.user
    ? { id: session.user.id, email: session.user.email ?? '' }
    : null;
  const same =
    (next === null && current === null) ||
    (next !== null && current !== null && next.id === current.id);
  if (same) return;
  current = next;
  notify();
}

function start(): void {
  if (started) return;
  started = true;
  const client = supabase();
  if (!client) return;

  void client.auth.getSession().then(({ data }) => adopt(data.session));
  client.auth.onAuthStateChange((_event, session) => adopt(session));
}

export function subscribeAccount(onChange: () => void): () => void {
  start();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export const getAccount = (): Account | null => current;

/** The server cannot know, and must render the signed out shape. */
export const getAccountOnServer = (): Account | null => null;

export type SignInResult =
  | { ok: true }
  | { ok: false; reason: 'no-backend' | 'bad-email' | 'failed'; message: string };

/** Loose on purpose: the inbox is the real check, not a regular expression. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendSignInLink(email: string): Promise<SignInResult> {
  const address = email.trim();
  if (!LOOKS_LIKE_EMAIL.test(address))
    return {
      ok: false,
      reason: 'bad-email',
      message: 'That does not look like an email address.',
    };

  const client = supabase();
  if (!client)
    return {
      ok: false,
      reason: 'no-backend',
      message: 'This copy of the app has no account service set up.',
    };

  const { error } = await client.auth.signInWithOtp({
    email: address,
    options: {
      // Back to where they were, so the link does not land them on a
      // different screen than the one they left.
      emailRedirectTo:
        typeof window === 'undefined' ? undefined : window.location.href,
    },
  });

  if (error) return { ok: false, reason: 'failed', message: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const client = supabase();
  if (!client) return;
  await client.auth.signOut();
  adopt(null);
}

/** Whether an account is possible at all in this build. */
export const accountsAvailable = (): boolean => hasBackend();
