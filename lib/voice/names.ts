import type { PlayerNames, Seat } from '@/lib/scoring';

/**
 * Finding the four players in a spoken sentence.
 *
 * General speech recognition mangles names, and it mangles exactly the names a
 * mahjong table uses: short, often not English, often nicknames. Asking a
 * recogniser to transcribe "Cal" correctly is a losing game.
 *
 * What saves it is that this is never an open question. The table has four
 * people and the app knows all four, so the job is not "what name was said"
 * but "which of these four was it, or none". A guess only has to beat three
 * rivals, and when it does not clearly beat them it is thrown away.
 */

/** How alike two words have to be before a mishearing is plausible. */
const MIN_LIKENESS = 0.45;
/**
 * How far ahead of the runner-up the winner has to be. This is the rule that
 * does the real work: "casey" is a poor match for Cal in isolation and an
 * obvious one next to Di, Ann and Bo.
 */
const MIN_LEAD = 0.2;

/**
 * Words that are part of the sentence rather than somebody's name. Skipped
 * unless a player is actually called one of them, in which case an exact
 * match still wins and the sentence has to cope.
 */
const GRAMMAR_WORDS = new Set([
  'won', 'win', 'wins', 'winner', 'from', 'off', 'of', 'the', 'a', 'and',
  'by', 'to', 'for', 'with', 'on', 'points', 'point', 'faan', 'fan', 'self',
  'drew', 'draw', 'drawn', 'zi', 'mo', 'zimo', 'selfdraw', 'false', 'wash',
  'out', 'limit', 'hand', 'discard', 'discarded', 'it', 'his', 'her', 'their',
  'got', 'had', 'took', 'paid', 'pays', 'that', 'was', 'is',
]);

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/** 1 for the same word, 0 for nothing in common. */
function likeness(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  return 1 - levenshtein(a, b) / longest;
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Every way one player's name might come back, longest first. */
function spellingsFor(name: string): string[] {
  const whole = normalise(name);
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);
  return [...new Set([whole, ...words])].filter(Boolean);
}

export interface NamedPlayer {
  seat: Seat;
  /** Where in the phrase they were named, so word order can say who did what. */
  at: number;
}

/**
 * Who was named, in the order they were said.
 *
 * Windows of two words as well as one, because a recogniser splits a name it
 * does not know: "Di" comes back as "dean o" about as often as itself.
 */
export function namesIn(
  tokens: string[],
  players: PlayerNames,
): NamedPlayer[] {
  const spellings = players.map((name) => spellingsFor(name));
  const found: NamedPlayer[] = [];

  let index = 0;
  while (index < tokens.length) {
    const candidates: { text: string; width: number }[] = [];
    if (index + 1 < tokens.length) {
      candidates.push({
        text: normalise(tokens[index] + tokens[index + 1]),
        width: 2,
      });
    }
    candidates.push({ text: normalise(tokens[index]), width: 1 });

    let best: { seat: Seat; score: number; width: number } | null = null;
    let runnerUp = 0;

    for (const { text, width } of candidates) {
      if (text === '') continue;
      // A word doing a job in the sentence is only a name if it is exactly
      // somebody's name.
      const isGrammar = width === 1 && GRAMMAR_WORDS.has(text);
      for (let seat = 0; seat < spellings.length; seat += 1) {
        for (const spelling of spellings[seat]) {
          const exact = spelling === text;
          if (isGrammar && !exact) continue;
          // Recognisers mishear the middle of a word far more readily than
          // its opening sound, so a mishearing has to start the same way.
          if (!exact && spelling[0] !== text[0]) continue;
          const score = exact ? 1 : likeness(spelling, text);
          if (score < MIN_LIKENESS) continue;
          if (!best || score > best.score) {
            if (best && best.seat !== (seat as Seat)) runnerUp = best.score;
            best = { seat: seat as Seat, score, width };
          } else if (seat !== best.seat && score > runnerUp) {
            runnerUp = score;
          }
        }
      }
    }

    if (best && best.score - runnerUp >= MIN_LEAD) {
      found.push({ seat: best.seat, at: index });
      index += best.width;
      continue;
    }
    index += 1;
  }

  return found;
}
