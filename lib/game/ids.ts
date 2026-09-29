/** Stable ids and share slugs, without pulling in a dependency. */

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

const SLUG_ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789';

/** A short, unambiguous slug for a share link. */
export function newShareSlug(length = 10): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  let slug = '';
  for (const byte of bytes) slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return slug;
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
