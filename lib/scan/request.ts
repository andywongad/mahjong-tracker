/**
 * Who is asking, worked out from the request alone.
 *
 * Server only. Everything here is either derived from headers the edge sets or
 * from a token the caller presents; nothing is taken on the client's word
 * except the device id, which is a soft limit by design and is documented as
 * one.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScanConfig } from './config';
import { hashIp, ipOf, matchesAdminToken } from './gate';

export interface Caller {
  deviceId: string;
  ipHash: string;
  userId: string | null;
  isAdmin: boolean;
}

export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export async function identify(
  request: Request,
  config: ScanConfig,
  db: SupabaseClient | null,
  deviceId: string,
): Promise<Caller> {
  const isAdmin = matchesAdminToken(
    request.headers.get('x-admin-token'),
    config.adminToken,
  );

  // A missing salt must not mean "hash everything to the same value", which
  // would put the whole world in one IP bucket.
  const salt = config.ipSalt ?? 'scan-ip-salt-unset';
  const ipHash = hashIp(ipOf(request.headers), salt);

  let userId: string | null = null;
  const auth = request.headers.get('authorization');
  if (db && auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length);
    const { data } = await db.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  return { deviceId, ipHash, userId, isAdmin };
}
