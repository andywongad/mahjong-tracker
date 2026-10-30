'use client';

/**
 * The admin token, kept in this browser.
 *
 * It lives in localStorage rather than React state because it outlives the
 * page and another tab can change it, so it is read through a subscription
 * rather than copied into state after mount. It is only ever sent as a header.
 */
const KEY = 'mahjong.scan.adminToken';
const listeners = new Set<() => void>();

export function subscribeAdminToken(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function adminToken(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

/** Server rendering has no storage, so nobody is signed in there. */
export const adminTokenOnServer = (): string => '';

export function setAdminToken(token: string): void {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // Not stored; this page view still works.
  }
  for (const listener of listeners) listener();
}
