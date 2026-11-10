import { describe, expect, it } from 'vitest';
import { HK_STANDARD } from '@/lib/rules/types';
import { parseAlternatives, parseHandSpeech } from '../grammar';

/**
 * The whole feature rests on this file. A microphone cannot be tested at a
 * noisy table from here, but every phrase a table might say is a string, and
 * so is every way a recogniser might mangle one.
 *
 * The rule being pinned throughout: never guess. A phrase that could mean two
 * scores has to be refused, because a wrong faan recorded silently is worse
 * than being asked to say it again.
 */

const read = (said: string) => parseHandSpeech(said, HK_STANDARD);
const heardFrom = (said: string) => {
  const parsed = read(said);
  if (!parsed.ok) throw new Error(`refused: ${parsed.reason}`);
  return parsed.heard;
};
const refusal = (said: string) => {
  const parsed = read(said);
  if (parsed.ok) throw new Error(`parsed: ${JSON.stringify(parsed.heard)}`);
  return parsed.reason;
};

describe('a bare number', () => {
  it('reads the digits a recogniser usually returns', () => {
    expect(heardFrom('5')).toEqual({ type: undefined, faan: 5 });
    expect(heardFrom('13')).toEqual({ type: undefined, faan: 13 });
  });

  it('reads the word, and the trailing faan if it was said', () => {
    expect(heardFrom('five').faan).toBe(5);
    expect(heardFrom('five faan').faan).toBe(5);
    expect(heardFrom('Seven.').faan).toBe(7);
  });

  it('reads every number the table can score', () => {
    const words = [
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'thirteen',
    ];
    expect(words.map((word) => heardFrom(word).faan)).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
  });

  it('reads the homophones a recogniser really returns', () => {
    expect(heardFrom('for').faan).toBe(4);
    expect(heardFrom('ate').faan).toBe(8);
    expect(heardFrom('free').faan).toBe(3);
    // Thirty is not a score any table pays, so thirteen is the only thing
    // it can have been.
    expect(heardFrom('thirty').faan).toBe(13);
  });

  it('takes the limit as the most the table pays', () => {
    expect(heardFrom('limit').faan).toBe(13);
    expect(heardFrom('limit hand').faan).toBe(13);
  });
});

describe('how the hand was won', () => {
  it('hears a self draw, however it was said', () => {
    for (const said of [
      'self drew five',
      'self draw 5',
      'self drawn five',
      'zi mo five',
      'zimo 5',
    ]) {
      expect(heardFrom(said)).toEqual({ type: 'zi_mo', faan: 5 });
    }
  });

  it('hears a discard', () => {
    expect(heardFrom('discard five')).toEqual({
      type: 'ceot_cung',
      faan: 5,
    });
    expect(heardFrom('five off a discard').type).toBe('ceot_cung');
  });

  it('takes the type on its own, leaving the faan to be tapped', () => {
    expect(heardFrom('self drew')).toEqual({
      type: 'zi_mo',
      faan: undefined,
    });
  });

  it('ignores a name it was never taught', () => {
    // Names are tapped, not spoken, but saying one must not break the phrase.
    expect(heardFrom('Ann self drew five')).toEqual({
      type: 'zi_mo',
      faan: 5,
    });
    expect(heardFrom('five off Bo').faan).toBe(5);
  });

  it('refuses a phrase that claims both routes', () => {
    expect(refusal('self drew off a discard five')).toMatch(/at once/);
  });
});

describe('refusing rather than guessing', () => {
  it('will not choose between two numbers', () => {
    expect(refusal('five six')).toMatch(/I heard 5 and 6/);
    expect(refusal('eleven or twelve')).toMatch(/Say just the one number/);
  });

  it('prefers a real number over a word that merely sounds like one', () => {
    // "for" here is a preposition, and five is the score. Treating both as
    // numbers would refuse a phrase that was never ambiguous.
    expect(heardFrom('five for Bo').faan).toBe(5);
    expect(heardFrom('nine to Ann').faan).toBe(9);
  });

  it('says so when the number is under the table minimum', () => {
    expect(refusal('two')).toBe(
      "2 is under this table's minimum of 3 faan.",
    );
  });

  it('says so when the number is over the cap', () => {
    expect(refusal('20')).toBe("20 is over this table's cap of 13 faan.");
  });

  it('repeats back a phrase it could not place', () => {
    expect(refusal('what about the weather')).toBe(
      'I heard "what about the weather".',
    );
  });

  it('has something to say about silence', () => {
    expect(refusal('')).toBe('I did not catch that.');
    expect(refusal('   ')).toBe('I did not catch that.');
  });
});

describe('a table with its own range', () => {
  const ourTable = { ...HK_STANDARD, minFaan: 1, faanCap: 10 };

  it('accepts a faan this table allows and the standard one does not', () => {
    const parsed = parseHandSpeech('one', ourTable);
    expect(parsed.ok && parsed.heard.faan).toBe(1);
  });

  it('caps the limit at the cap this table set', () => {
    const parsed = parseHandSpeech('limit', ourTable);
    expect(parsed.ok && parsed.heard.faan).toBe(10);
  });

  it('refuses a faan over the cap this table set', () => {
    const parsed = parseHandSpeech('thirteen', ourTable);
    expect(parsed.ok).toBe(false);
  });
});

describe('reading down the guesses', () => {
  it('takes the best guess that is a phrase at all', () => {
    // What a recogniser hands back: its favourite is not a hand.
    const parsed = parseAlternatives(
      ['find a mo five', 'self drew five', 'shelf through five'],
      HK_STANDARD,
    );
    expect(parsed.ok && parsed.heard).toEqual({ type: 'zi_mo', faan: 5 });
  });

  it('prefers a guess that answers both questions', () => {
    // The recogniser is surest about the guess that only has a number in it.
    // It ranks sounds, and knows nothing about mahjong.
    const parsed = parseAlternatives(['five', 'self drew five'], HK_STANDARD);
    expect(parsed.ok && parsed.heard).toEqual({ type: 'zi_mo', faan: 5 });
  });

  it('lets confidence break a tie and nothing more', () => {
    const parsed = parseAlternatives(
      ['self drew five', 'discard five'],
      HK_STANDARD,
    );
    expect(parsed.ok && parsed.heard.type).toBe('zi_mo');
  });

  it('keeps the top guess when explaining a failure', () => {
    // The first guess is what was most likely said, so it is the one worth
    // repeating back, not the fourth.
    const parsed = parseAlternatives(['the tiles are wet', 'nonsense'], HK_STANDARD);
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.reason).toBe('I heard "the tiles are wet".');
  });

  it('refuses when nothing was offered', () => {
    expect(parseAlternatives([], HK_STANDARD).ok).toBe(false);
  });

  it('does not let a worse guess rescue an out-of-range number', () => {
    // Both guesses parse to a number; neither is legal here. The complaint
    // should be about the likeliest one.
    const parsed = parseAlternatives(['two', 'too'], HK_STANDARD);
    expect(!parsed.ok && parsed.reason).toMatch(/minimum/);
  });
});
