/**
 * Everything about scanning that is set rather than decided in code.
 *
 * Server only. Nothing here may be imported from a client component: it reads
 * secrets, and Next would inline them into the bundle.
 *
 * The caps are read here and passed into the database function as arguments,
 * so the environment stays the single place a number is set and changing one
 * never needs a migration.
 */
const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return value !== 'false' && value !== '0';
};

export interface ScanConfig {
  enabled: boolean;
  requireSignIn: boolean;
  model: string;
  fallbackModel: string;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Long edge the client downscales to, and the eval script sweeps. */
  maxLongEdge: number;
  caps: {
    device: number;
    ip: number;
    global: number;
    account: number;
    admin: number;
  };
  anthropicKey: string | undefined;
  turnstileSecret: string | undefined;
  turnstileSiteKey: string | undefined;
  adminToken: string | undefined;
  ipSalt: string | undefined;
  supabaseUrl: string | undefined;
  serviceRoleKey: string | undefined;
  /** Turnstile and sign-in are not enforced on a developer's own machine. */
  isDevelopment: boolean;
}

export function scanConfig(
  env: Record<string, string | undefined> = process.env,
): ScanConfig {
  return {
    enabled: bool(env.SCAN_ENABLED, true),
    requireSignIn: bool(env.SCAN_REQUIRE_SIGNIN, false),
    model: env.SCAN_MODEL || 'claude-haiku-5-5',
    fallbackModel: env.SCAN_FALLBACK_MODEL || 'claude-sonnet-5-5',
    effort: (env.SCAN_EFFORT as ScanConfig['effort']) || 'low',
    maxLongEdge: num(env.SCAN_MAX_LONG_EDGE, 1568),
    caps: {
      device: num(env.SCAN_DEVICE_DAILY_CAP, 60),
      ip: num(env.SCAN_IP_DAILY_CAP, 150),
      global: num(env.SCAN_GLOBAL_DAILY_CAP, 1000),
      account: num(env.SCAN_DAILY_CAP, 60),
      admin: num(env.SCAN_ADMIN_DAILY_CAP, 200),
    },
    anthropicKey: env.ANTHROPIC_API_KEY,
    turnstileSecret: env.TURNSTILE_SECRET_KEY,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    adminToken: env.SCAN_ADMIN_TOKEN,
    ipSalt: env.SCAN_IP_SALT,
    supabaseUrl:
      env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? undefined,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    isDevelopment: env.NODE_ENV === 'development',
  };
}
