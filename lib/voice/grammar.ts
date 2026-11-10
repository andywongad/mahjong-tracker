import { isCompleteHand, type Hand, type HandType, type PlayerNames, type Seat } from '@/lib/scoring';
import type { Rules } from '@/lib/rules/types';
import { namesIn } from './names';

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
 * for four, "ate" for eight. They are kept apart from the
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

  const faan = faanIn(tokens, padded, rules);
  if (typeof faan === 'string') return { ok: false, reason: faan };

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

/* ------------------------------------------------------------------ *
 * A whole hand, said from the table                                   *
 * ------------------------------------------------------------------ */

/** Ways of saying nobody won. */
const DRAW_PHRASES = ['draw', 'drawn game', 'wash out', 'washout', 'no win'];

/** Ways of saying somebody claimed a win they did not have. */
const ZAA_WU_PHRASES = ['false win', 'falsewin', 'zaa wu', 'zaawu', 'ja wu'];

/** What separates the winner from whoever fed them. */
const FROM_WORDS = ['from', 'off', 'of'];

/** Everything one sentence said about a hand, as far as it got. */
export interface HeardHand {
  type?: HandType;
  winnerSeat?: Seat;
  discarderSeat?: Seat;
  offenderSeat?: Seat;
  faan?: number;
}

export type ParsedHand =
  | { ok: true; heard: HeardHand }
  | { ok: false; reason: string };

/**
 * Read a whole hand out of one sentence, said with nothing tapped first.
 *
 * "Cal won 6 points from Di" is four answers at once, and the only hard
 * one is the names - see namesIn, which decides between four people rather
 * than transcribing. Word order does the rest: the first player named is who
 * the hand is about, and a second is who fed it.
 *
 * Refusing is always available and often right. A sentence naming one player
 * twice, or naming somebody as both winner and shooter, is a mishearing and
 * not a hand.
 */
export function parseTableSpeech(
  said: string,
  players: PlayerNames,
  rules: Rules,
): ParsedHand {
  const { tokens, padded } = normalise(said);
  if (tokens.length === 0) return { ok: false, reason: 'I did not catch that.' };

  const named = namesIn(tokens, players);

  // A draw belongs to nobody, so it is the one hand that needs no name - and
  // naming somebody means this was not a draw at all.
  if (mentions(padded, DRAW_PHRASES) && named.length === 0) {
    return { ok: true, heard: { type: 'draw' } };
  }

  if (mentions(padded, ZAA_WU_PHRASES)) {
    if (named.length !== 1) {
      return {
        ok: false,
        reason:
          named.length === 0
            ? 'A false win needs a name. Say who called it.'
            : 'I heard more than one name for a false win.',
      };
    }
    return {
      ok: true,
      heard: { type: 'zaa_wu', offenderSeat: named[0].seat },
    };
  }

  if (named.length === 0) {
    return {
      ok: false,
      reason: `I heard "${tokens.join(' ')}", but nobody at this table.`,
    };
  }
  if (named.length > 2) {
    return { ok: false, reason: 'I heard too many names for one hand.' };
  }

  // Which slot each name is in, rather than simply its turn to be said. A
  // name after "from" is who fed the hand, and that stays true when the name
  // before it was somebody who is not playing: "Ed won 6 from Di" has a
  // shooter and no winner, which is a mishearing and not a hand.
  const fed: Seat[] = [];
  const won: Seat[] = [];
  let since = 0;
  for (const { seat, at } of named) {
    const between = tokens.slice(since, at);
    (between.some((word) => FROM_WORDS.includes(word)) ? fed : won).push(seat);
    since = at + 1;
  }

  if (won.length === 0) {
    return {
      ok: false,
      reason: 'I heard who fed it, but not who won.',
    };
  }

  const winnerSeat = won[0];
  const other = fed[0] ?? won[1];
  if (other === winnerSeat) {
    return {
      ok: false,
      reason: `I heard ${players[winnerSeat]} twice. Say who won and who fed it.`,
    };
  }

  const faan = faanIn(tokens, padded, rules);
  if (typeof faan === 'string') return { ok: false, reason: faan };

  const selfDrawn = mentions(padded, ZI_MO_PHRASES);
  if (selfDrawn && other !== undefined) {
    return {
      ok: false,
      reason: 'A self draw has no shooter, but I heard two names.',
    };
  }

  // Said off somebody, or said as a self draw, or neither - in which case the
  // sheet opens and asks, rather than this guessing between the two.
  const type: HandType | undefined = selfDrawn
    ? 'zi_mo'
    : other !== undefined || mentions(padded, FROM_WORDS)
      ? 'ceot_cung'
      : undefined;

  return {
    ok: true,
    heard: {
      type,
      winnerSeat,
      discarderSeat: other,
      faan,
    },
  };
}

/**
 * The faan in a sentence, or the complaint about it. Shared with the shorter
 * phrases the record sheet listens for, including the rule that a homophone
 * only counts when no real number was heard.
 */
function faanIn(
  tokens: string[],
  padded: string,
  rules: Rules,
): number | undefined | string {
  const spoken = numbersIn(tokens);
  if (mentions(padded, LIMIT_PHRASES)) spoken.heard.push(rules.faanCap);
  // A homophone is a last resort, so "five for Bo" is five and not an argument
  // between five and four.
  const sure = [...new Set(spoken.heard)];
  const all = sure.length > 0 ? sure : [...new Set(spoken.maybe)];
  if (all.length === 0) return undefined;

  /*
   * A number this table cannot score is not a rival to one it can.
   *
   * From a real transcript: "Cal won 6 points from Di" came back as
   * "Cal 1 610 six points from Di". The 1 is the wreckage of "won", and
   * treating it as a competing answer would refuse a sentence whose only
   * scorable number was never in doubt.
   */
  const legal = all.filter(
    (faan) => faan >= rules.minFaan && faan <= rules.faanCap,
  );
  if (legal.length === 1) return legal[0];
  if (legal.length > 1) {
    return `I heard ${legal.join(' and ')}. Say just the one number.`;
  }

  // Nothing said was scorable here, so say what was wrong with it.
  const faan = all[0];
  if (faan < rules.minFaan) {
    return `${faan} is under this table's minimum of ${rules.minFaan} faan.`;
  }
  return `${faan} is over this table's cap of ${rules.faanCap} faan.`;
}

/**
 * The same read-down-the-guesses rule as the record sheet's, counting how
 * many of a hand's questions each guess managed to answer.
 */
export function parseTableAlternatives(
  alternatives: string[],
  players: PlayerNames,
  rules: Rules,
): ParsedHand {
  let best: { parsed: ParsedHand & { ok: true }; answers: number } | null =
    null;
  let firstFailure: (ParsedHand & { ok: false }) | null = null;

  for (const said of alternatives) {
    const parsed = parseTableSpeech(said, players, rules);
    if (!parsed.ok) {
      firstFailure ??= parsed;
      continue;
    }
    const { heard } = parsed;
    const answers =
      (heard.type ? 1 : 0) +
      (heard.winnerSeat !== undefined ? 1 : 0) +
      (heard.discarderSeat !== undefined ? 1 : 0) +
      (heard.offenderSeat !== undefined ? 1 : 0) +
      (heard.faan !== undefined ? 1 : 0);
    if (!best || answers > best.answers) best = { parsed, answers };
  }

  if (best) return best.parsed;
  return firstFailure ?? { ok: false, reason: 'I did not catch that.' };
}

/**
 * The finished hand a sentence amounts to, or null when it did not amount to
 * one. Null is the ordinary case for half a sentence, and it is the signal to
 * open the sheet with what was heard already filled in, rather than to record
 * anything.
 */
export function handFrom(heard: HeardHand, rules: Rules): Hand | null {
  const draft = {
    type: heard.type ?? null,
    winnerSeat: heard.winnerSeat ?? null,
    discarderSeat: heard.discarderSeat ?? null,
    offenderSeat: heard.offenderSeat ?? null,
    faan: heard.faan ?? null,
  };
  if (!isCompleteHand(draft, rules)) return null;
  switch (heard.type) {
    case 'ceot_cung':
      return {
        type: 'ceot_cung',
        winnerSeat: heard.winnerSeat as Seat,
        discarderSeat: heard.discarderSeat as Seat,
        faan: heard.faan as number,
      };
    case 'zi_mo':
      return {
        type: 'zi_mo',
        winnerSeat: heard.winnerSeat as Seat,
        faan: heard.faan as number,
      };
    case 'zaa_wu':
      return { type: 'zaa_wu', offenderSeat: heard.offenderSeat as Seat };
    case 'draw':
      return { type: 'draw' };
    default:
      return null;
  }
}
