/**
 * One example hand per pattern, so the glossary can show what a pattern looks
 * like instead of only describing it.
 *
 * These are illustrations, not rules: the engine records faan, never tiles.
 * Notation is the shorthand in lib/tiles — digits then a suit letter, honours
 * as E S W N for the winds and C F P for red, green and white, a group prefixed
 * with "+" for the tile that won the hand.
 *
 * Patterns about timing or concealment rather than shape (a heavenly hand, a
 * flower, a self draw) have no entry. A picture of those would be a picture of
 * an ordinary hand, which teaches nothing.
 */

export interface PatternExample {
  hand: string;
  /** What to look at. The hand alone rarely makes the point on its own. */
  note: string;
}

export const PATTERN_EXAMPLES: Record<string, PatternExample> = {
  all_sequences: {
    hand: '123m 456m 789p 234s 55s',
    note: 'Four runs and a pair. One triplet anywhere and it is no longer Ping Wu.',
  },
  seat_wind: {
    hand: 'EEE 123m 456p 789s 55s',
    note: 'The triplet is East, and you are sitting East. A pair is not enough.',
  },
  round_wind: {
    hand: 'SSS 123m 456p 789s 55s',
    note: 'A triplet of the prevailing wind. In a South round, South counts for everyone.',
  },
  dragon_triplet: {
    hand: 'CCC 123m 456p 789s 55s',
    note: 'Any triplet of red, green or white. Each one counts separately.',
  },
  all_triplets: {
    hand: '111m 555p 999s EEE 33s',
    note: 'Four triplets and a pair, with no runs at all.',
  },
  mixed_one_suit: {
    hand: '123m 456m 789m EEE 11m',
    note: 'One suit plus honours. Add a tile from another suit and it is gone.',
  },
  small_three_dragons: {
    hand: 'CCC FFF PP 123m 456p',
    note: 'Two dragon triplets and the pair of the third.',
  },
  full_flush: {
    hand: '123p 456p 789p 111p 99p',
    note: 'One suit and nothing else, not even a wind.',
  },
  big_three_dragons: {
    hand: 'CCC FFF PPP 123m 55p',
    note: 'All three dragons as triplets. The pair is whatever you like.',
  },
  small_four_winds: {
    hand: 'EEE SSS WWW NN 123m',
    note: 'Three wind triplets and the pair of the fourth.',
  },
  all_honors: {
    hand: 'EEE SSS WWW CCC FF',
    note: 'Winds and dragons only, with no numbered tile anywhere.',
  },
  thirteen_orphans: {
    hand: '19m 19p 19s ESWNCFP +P',
    note: 'Every terminal and every honour, once each, with one of them paired.',
  },
  big_four_winds: {
    hand: 'EEE SSS WWW NNN 55p',
    note: 'All four winds as triplets. The rarest of the wind hands.',
  },
  nine_gates: {
    hand: '111p 2345678p 999p +5p',
    note: 'One suit, 1112345678999, waiting on any of the nine. Here the five completes it.',
  },
  seven_pairs: {
    hand: '11m 44m 22p 77p 33s 88s EE',
    note: 'Seven different pairs. A house rule, not part of standard Hong Kong scoring.',
  },
  single_wait: {
    hand: '123m 456m 789p 234s 5s +5s',
    note: 'The last tile completed the pair, so only one tile in the wall could win.',
  },
  pair_258: {
    hand: '123m 456m 789p 234s 55s',
    note: 'The pair is a two, a five or an eight. Here it is the five of bamboo.',
  },
  all_simples: {
    hand: '234m 567m 345p 678s 55s',
    note: 'No ones, no nines, no winds, no dragons.',
  },
  lacking_a_suit: {
    hand: '123m 456m 789m 234p 55p',
    note: 'Characters and dots only. The whole bamboo suit is missing.',
  },
};
