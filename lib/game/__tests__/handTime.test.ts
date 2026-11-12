import { describe, expect, it } from 'vitest';
import { formatHandTime } from '../format';

/**
 * When a hand was written down. The hand itself is what the row is about, so
 * this is the quietest thing on it - but it has to be right, and it has to
 * say nothing at all rather than something wrong.
 */

describe('the time a hand was recorded', () => {
  it('reads as a clock time, not a date', () => {
    const shown = formatHandTime('2026-11-12T21:42:00.000Z');
    expect(shown).toMatch(/^\d{1,2}:\d{2}( ?[ap]m)?$/);
    expect(shown).not.toMatch(/2026|Nov/);
  });

  it('has nothing to say about a hand recorded before this existed', () => {
    // Every hand played until now. A blank is the honest answer; a guess
    // would be a time somebody could read as real.
    expect(formatHandTime(undefined)).toBeNull();
  });

  it('refuses a timestamp it cannot read rather than printing a bad date', () => {
    expect(formatHandTime('not a time')).toBeNull();
    expect(formatHandTime('')).toBeNull();
  });
});
