'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasBackend, supabase } from './client';

interface AuthValue {
  /** Null when signed out, or when this build has no server at all. */
  session: Session | null;
  /** True until the stored session has been checked. */
  loading: boolean;
  /** Whether signing in is even possible here. */
  available: boolean;
  email: string | null;
  /** Send a magic link. Resolves when the mail is away, not when it is used. */
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Signing in is optional.
 *
 * The app is local first: every game works, and keeps working, with no account
 * at all. An account adds syncing and share links on top. So nothing here gates
 * the app, and a build with no server configured simply reports that signing in
 * is unavailable rather than breaking.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(hasBackend());

  useEffect(() => {
    // With no server there is nothing to restore; loading already starts false.
    const client = supabase();
    if (!client) return;

    let cancelled = false;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Covers signing in, signing out, token refresh, and the magic link
    // landing back on the page with a session in the URL.
    const { data: subscription } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    const client = supabase();
    if (!client) throw new Error('This copy of the app has no server configured.');

    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Back to wherever they started, so the link does not dump them on a
        // different screen from the one they were using.
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const client = supabase();
    if (!client) return;
    await client.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      available: hasBackend(),
      email: session?.user?.email ?? null,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
