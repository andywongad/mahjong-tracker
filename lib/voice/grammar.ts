import type { HandType } from '@/lib/scoring';
import type { Rules } from '@/lib/rules/types';

/**
 * Turning one spoken phrase into the answers the record sheet is waiting for.
 *
 * This is not dictation. By the time anyone speaks, a seat has been tapped, so
 * the only questions left are how the hand was won and for how many faan: two
 * verbs and a number between the table minimum and its cap. That makes the
 * whole language a few dozen valid phrases, which is why a parser written by
 * hand beats asking a recogniser to understand a sentence.
 *
 * Nothing here touches the microphone or the browser, so every phrase a table
 * might say can be tested as a string.
 */

/** The win types a spoken phrase can name. A draw and a false win have no winner. */
export type SpokenType = Extract<HandType, 'ceot_cung' | 'zi_mo'>;

/** What one phrase managed to fill in. At least one field is always set. */
export interface Heard {
  /** Set only when the words said which route the win took. */
  type?: SpokenType;
  /** Faan, already checked against this table's range. */
  faan?: number;
}

export type Parsed =
  | { ok: true; heard: Heard }
  | { ok: false; reason: string };

/**
 * The numbers as they are actually spelled. One and two are here only so that
 * saying them earns a straight answer about the table minimum rather than a
 * shrug.
 */
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
};

/**
 * Words a general recogniser really does return in place of a number: "for"
 * for four, "ate" for eight, "won" for one. They are kept apart from the
 * spellings above because they are also ordinary English, so "five for Bo"
 * names one number and a preposition rather than two numbers. A number heard
 * this way is only used when nothing was heard properly.
 *
 * "thirty" is the one guess in this list, and a safe one: no table scores a
 * hand at thirty faan, so the only thing anybody saying it can have meant is
 * thirteen. Everything else should be added from the misses log rather than
 * imagined - see MISHEARD_NOTE below.
 */
const NUMBER_HOMOPHONES: Record<string, number> = {
  won: 1,
  to: 2,
  too: 2,
  free: 3,
  for: 4,
  fore: 4,
  ate: 8,
  thirty: 13,
};

/** Ways of saying the winner drew it themselves. */
const ZI_MO_PHRASES = [
  'self drew',
  'self draw',
  'self drawn',
  'selfdraw',
  'selfdrew',
  'self',
  'zi mo',
  'zimo',
  'ji mo',
  'jimo',
];

/** Ways of saying the win came off somebody's discard. */
const CEOT_CUNG_PHRASES = [
  'off a discard',
  'off the discard',
  'off',
  'discard',
  'discarded',
  'ceot cung',
  'cheut chung',
  'chut chung',
];

/** Ways of asking for the most the table pays. */
const LIMIT_PHRASES = ['limit', 'limit hand', 'max', 'maximum', 'cap'];

/**
 * Shown in the debug panel beside the phrases that did not parse.
 *
 * The lists above are English homophones and plain spellings. The Cantonese
 * readings are a starting guess, because what a recogniser makes of "zi mo"
 * across a room of shuffling tiles is a question for a real table and not for
 * a code review. Every phrase that fails is kept locally, so the lists grow
 * from what was actually said rather than from invention.
 */
export const MISHEARD_NOTE =
  'Add these to the phrase lists in lib/voice/grammar.ts.';

/** Lowercase, drop punctuation, and pad so every phrase matches whole words. */
function normalise(said: string): { tokens: string[]; padded: string } {
  const tokens = said
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  return { tokens, padded: ` ${tokens.join(' ')} ` };
}

function mentions(padded: string, phrases: string[]): boolean {
  return phrases.some((phrase) => padded.includes(` ${phrase} `));
}

/**
 * Every number named in the phrase, split by how surely it was a number.
 * `heard` are digits and real spellings; `maybe` are the homophones, which
 * only count when nothing in `heard` does.
 */
function numbersIn(tokens: string[]): { heard: number[]; maybe: number[] } {
  const heard: number[] = [];
  const maybe: number[] = [];
  for (const token of tokens) {
    if (/^\d{1,2}$/.test(token)) {
      heard.push(Number(token));
      continue;
    }
    const word = NUMBER_WORDS[token];
    if (word !== undefined) {
      heard.push(word);
      continue;
    }
    const loose = NUMBER_HOMOPHONES[token];
    if (loose !== undefined) maybe.push(loose);
  }
  return { heard, maybe };
}

/**
 * Read one transcript against this table's rules.
 *
 * Two different numbers in one phrase is a refusal rather than a guess: the
 * cost of recording the wrong score is far higher than the cost of asking
 * somebody to say it again.
 */
export function parseHandSpeech(said: string, rules: Rules): Parsed {
  const { tokens, padded } = normalise(said);
  if (tokens.length === 0) return { ok: false, reason: 'I did not catch that.' };

  const selfDrawn = mentions(padded, ZI_MO_PHRASES);
  const offDiscard = mentions(padded, CEOT_CUNG_PHRASES);
  if (selfDrawn && offDiscard) {
    return {
      ok: false,
      reason: 'That sounded like a self draw and a discard at once.',
    };
  }
  const type: SpokenType | undefined = selfDrawn
    ? 'zi_mo'
    : offDiscard
      ? 'ceot_cung'
      : undefined;

  const spoken = numbersIn(tokens);
  if (mentions(padded, LIMIT_PHRASES)) spoken.heard.push(rules.faanCap);
  // A homophone is a last resort, so "five for Bo" is five and not an argument
  // between five and four.
  const sure = [...new Set(spoken.heard)];
  const distinct = sure.length > 0 ? sure : [...new Set(spoken.maybe)];

  if (distinct.length > 1) {
    return {
      ok: false,
      reason: `I heard ${distinct.join(' and ')}. Say just the one number.`,
    };
  }

  const faan = distinct[0];
  if (faan !== undefined) {
    if (faan < rules.minFaan) {
      return {
        ok: false,
        reason: `${faan} is under this table's minimum of ${rules.minFaan} faan.`,
      };
    }
    if (faan > rules.faanCap) {
      return {
        ok: false,
        reason: `${faan} is over this table's cap of ${rules.faanCap} faan.`,
      };
    }
  }

  if (type === undefined && faan === undefined) {
    return {
      ok: false,
      reason: `I heard "${tokens.join(' ')}".`,
    };
  }

  return { ok: true, heard: { type, faan } };
}

/**
 * Read the likeliest guess that makes sense, rather than the likeliest guess.
 *
 * A recogniser hands back several transcripts ranked by confidence, and
 * because this language is tiny, most of them are not phrases at all. Two
 * things follow. A lower guess that parses beats a top guess that does not:
 * "find a mo five" above "self drew five" is noise winning on confidence. And
 * a guess that answers both questions beats one that answers only the number,
 * since the recogniser's ranking knows about sounds and nothing about mahjong.
 * Confidence breaks ties and decides nothing else.
 */
export function parseAlternatives(
  alternatives: string[],
  rules: Rules,
): Parsed {
  let best: { parsed: Parsed & { ok: true }; answers: number } | null = null;
  let firstFailure: (Parsed & { ok: false }) | null = null;

  for (const said of alternatives) {
    const parsed = parseHandSpeech(said, rules);
    if (!parsed.ok) {
      // The top guess explains a failure best, since it is what was most
      // likely actually said.
      firstFailure ??= parsed;
      continue;
    }
    const answers =
      (parsed.heard.type ? 1 : 0) + (parsed.heard.faan !== undefined ? 1 : 0);
    // Strictly greater, so an equally complete guess does not displace a more
    // confident one.
    if (!best || answers > best.answers) best = { parsed, answers };
    if (answers === 2) break;
  }

  if (best) return best.parsed;
  return firstFailure ?? { ok: false, reason: 'I did not catch that.' };
}
