/**
 * The scan_events table, as seen from the server.
 *
 * SERVER ONLY. This module reads the service role key, which bypasses row
 * level security entirely. It must never be imported from a client component,
 * or Next will inline the key into the browser bundle. scan_events has no
 * policies at all: the service role is the only thing that can read or write
 * it, which is why this file is the only door.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ScanConfig } from './config';

export type Outcome = 'ok' | 'invalid' | 'error' | 'capped';
export type CapReason = 'device' | 'ip' | 'global' | 'account' | 'admin';

export interface Claim {
  allowed: boolean;
  scanId: string | null;
  reason: CapReason | null;
  remaining: number;
}

export interface Finish {
  scanId: string;
  outcome: Outcome;
  modelUsed: string;
  usedFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number | null;
  scannedTiles: unknown;
}

export function serviceClient(config: ScanConfig): SupabaseClient | null {
  if (!config.supabaseUrl || !config.serviceRoleKey) return null;
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Take one scan off the allowance, or refuse.
 *
 * Counting here and inserting afterwards would let two requests read the same
 * count and both pass the last slot, so both happen inside one transaction in
 * the database. The caps travel as arguments because the environment, not the
 * migration, is where they are set.
 */
export async function claimScan(
  db: SupabaseClient,
  config: ScanConfig,
  who: { deviceId: string; ipHash: string; userId: string | null; isAdmin: boolean },
): Promise<Claim> {
  const { data, error } = await db.rpc('scan_claim', {
    p_device_id: who.deviceId,
    p_ip_hash: who.ipHash,
    p_user_id: who.userId,
    p_is_admin: who.isAdmin,
    p_device_cap: who.isAdmin ? config.caps.admin : config.caps.device,
    p_ip_cap: config.caps.ip,
    p_global_cap: config.caps.global,
    p_account_cap: config.caps.account,
  });

  if (error) throw new Error(`scan_claim failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    scanId: row?.scan_id ?? null,
    reason: (row?.reason as CapReason | null) ?? null,
    remaining: Number(row?.remaining ?? 0),
  };
}

/** How many are left, without spending one. */
export async function remainingScans(
  db: SupabaseClient,
  config: ScanConfig,
  who: { deviceId: string; userId: string | null; isAdmin: boolean },
): Promise<number> {
  const { data, error } = await db.rpc('scan_remaining', {
    p_device_id: who.deviceId,
    p_user_id: who.userId,
    p_is_admin: who.isAdmin,
    p_device_cap: config.caps.device,
    p_global_cap: config.caps.global,
    p_account_cap: config.caps.account,
    p_admin_cap: config.caps.admin,
  });
  if (error) throw new Error(`scan_remaining failed: ${error.message}`);
  return Number(data ?? 0);
}

/** Write what the attempt turned out to be, onto the row it claimed. */
export async function finishScan(
  db: SupabaseClient,
  finish: Finish,
): Promise<void> {
  const { error } = await db
    .from('scan_events')
    .update({
      outcome: finish.outcome,
      model_used: finish.modelUsed,
      used_fallback: finish.usedFallback,
      input_tokens: finish.inputTokens,
      output_tokens: finish.outputTokens,
      est_cost_usd: finish.estCostUsd,
      scanned_tiles: finish.scannedTiles,
    })
    .eq('id', finish.scanId);
  if (error) throw new Error(`finishScan failed: ${error.message}`);
}

/**
 * Record what the player actually saved.
 *
 * Written once and never overwritten: the row must still be unconfirmed, and
 * the device must be the one that made the scan. With no sign-in there is
 * nothing stronger to check against — the scan id is a server-made uuid that
 * only reaches the client that asked for it, which makes this a soft guard
 * suited to an open test rather than a real authorisation.
 */
export async function confirmScan(
  db: SupabaseClient,
  args: { scanId: string; deviceId: string; tiles: unknown },
): Promise<boolean> {
  const { data, error } = await db
    .from('scan_events')
    .update({ confirmed_tiles: args.tiles })
    .eq('id', args.scanId)
    .eq('device_id', args.deviceId)
    .is('confirmed_tiles', null)
    .select('id');
  if (error) throw new Error(`confirmScan failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Attach an opted-in photo to its scan. */
export async function attachPhoto(
  db: SupabaseClient,
  args: { scanId: string; deviceId: string; path: string },
): Promise<boolean> {
  const { data, error } = await db
    .from('scan_events')
    .update({ photo_path: args.path })
    .eq('id', args.scanId)
    .eq('device_id', args.deviceId)
    .is('photo_path', null)
    .select('id');
  if (error) throw new Error(`attachPhoto failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
