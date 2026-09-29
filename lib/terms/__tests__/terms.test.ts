import { describe, expect, it } from 'vitest';
import {
  HAND_TYPE_TERMS,
  TERMS,
  TERM_BY_ID,
  glossOf,
  romanOf,
  termForHandType,
} from '..';

describe('the terms module', () => {
  it('has a term for every kind of hand the engine can record', () => {
    for (const type of ['ceot_cung', 'zi_mo', 'zaa_wu', 'draw'] as const) {
      const term = termForHandType(type);
      expect(term, type).toBeDefined();
      expect(term.zh.length).toBeGreaterThan(0);
      expect(term.english.length).toBeGreaterThan(0);
    }
    expect(Object.keys(HAND_TYPE_TERMS)).toHaveLength(4);
  });

  it('keeps the spelling the group uses for 出銃', () => {
    // Jyutping would be Ceot Cung. The exception is deliberate; see the module.
    expect(romanOf('cheut_chung')).toBe('Cheut Chung');
    expect(glossOf('cheut_chung')).toBe('Shooter');
  });

  it('gives every term exactly one gloss', () => {
    // The same term said two ways on two screens is what this prevents.
    for (const term of TERMS) {
      expect(TERM_BY_ID[term.id].english, term.id).toBe(term.english);
    }
  });

  it('has no duplicate ids', () => {
    const ids = TERMS.map((term) => term.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only points at terms that exist', () => {
    for (const term of TERMS) {
      for (const id of term.related ?? []) {
        expect(TERM_BY_ID[id], `${term.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it('leaves no term without a name or a definition', () => {
    for (const term of TERMS) {
      expect(term.roman.trim(), term.id).not.toBe('');
      expect(term.definition.trim(), term.id).not.toBe('');
    }
  });
});
