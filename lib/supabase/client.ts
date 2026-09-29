'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client, or null when the app has not been given a project.
 *
 * The app is local first and fully usable with no backend, so every caller has
 * to cope with null rather than assume a server exists. That is what keeps the
 * offline path honest: it is the normal path, not a fallback.
 *
 * Only the anon key belongs here. It ships to the browser on every request and
 * is safe to publish; row level security is what protects the data. A service
 * role key would bypass all of it and must never reach this file.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase renamed the browser key from "anon" to "publishable". Both names are
// accepted so a project of either vintage works without editing this file.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Whether this build has been pointed at a project at all. */
export function hasBackend(): boolean {
  return Boolean(url && anonKey);
}
