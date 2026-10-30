'use client';

/**
 * The Cloudflare bot check, loaded only when somebody actually scans.
 *
 * It is invisible in the ordinary case: most people never see it, and the
 * widget only shows itself when Cloudflare wants a challenge. The script comes
 * from Cloudflare's own origin, so the service worker ignores it — it only
 * handles same-origin requests — and nothing here is precached.
 *
 * A failure to load or to solve returns null rather than throwing. The server
 * then refuses the scan, which is the right way round: a bot check that fails
 * open is not a bot check.
 */
const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      size?: 'invisible' | 'normal' | 'compact';
      callback?: (token: string) => void;
      'error-callback'?: () => void;
      'timeout-callback'?: () => void;
    },
  ) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi | null> | null = null;

function loadScript(): Promise<TurnstileApi | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;

  loading = new Promise<TurnstileApi | null>((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * One token for one scan.
 *
 * A fresh widget each time, removed afterwards: a token is single use, and
 * holding one widget open across a long game is more state than this needs.
 */
export async function turnstileToken(
  siteKey: string,
  timeoutMs = 20_000,
): Promise<string | null> {
  const api = await loadScript();
  if (!api) return null;

  const host = document.createElement('div');
  host.style.display = 'none';
  document.body.appendChild(host);

  return new Promise<string | null>((resolve) => {
    let widgetId: string | null = null;
    let settled = false;

    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (widgetId) api.remove(widgetId);
      } catch {
        // Already gone.
      }
      host.remove();
      resolve(token);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      widgetId = api.render(host, {
        sitekey: siteKey,
        size: 'invisible',
        callback: (token) => finish(token),
        'error-callback': () => finish(null),
        'timeout-callback': () => finish(null),
      });
      api.execute(widgetId);
    } catch {
      finish(null);
    }
  });
}
