import type { HandType } from '@/lib/scoring';
import { PATTERNS } from '@/lib/patterns/catalog';

/**
 * Every term the app says, defined once.
 *
 * Labels, table headers, tags, tooltips and the glossary all read from here, so
 * a term cannot be spelled one way on one screen and another way on the next.
 * Nothing outside this file should contain a romanisation or a gloss.
 *
 * Romanisation is Jyutping throughout, with one deliberate exception: 出銃 is
 * written Cheut Chung, which is how the group that uses this app writes it.
 * Jyutping would be Ceot Cung. Do not "fix" it. The terms still waiting on a
 * native speaker are listed in TODO_ROMANISATION at the bottom.
 */
export interface Term {
  id: string;
  /** The name shown everywhere in the app. */
  roman: string;
  zh: string;
  /** A two or three word gloss. One per term, used on every screen. */
  english: string;
  /** One or two sentences, in plain English. */
  definition: string;
  related?: string[];
  group: 'scoring' | 'play' | 'table' | 'pattern';
  /** Set on the four terms that are also a kind of hand the engine records. */
  handType?: HandType;
}

const CORE: Term[] = [
  {
    id: 'faan',
    roman: 'Faan',
    zh: '番',
    english: 'Hand value',
    definition:
      'The value of a winning hand, counted up from the patterns it contains. Faan is what you record; the app turns it into points using the table rules, so the same hand can be worth different amounts at different tables.',
    related: ['sik_wu', 'baau_paang'],
    group: 'scoring',
  },
  {
    id: 'sik_wu',
    roman: 'Sik Wu',
    zh: '食糊',
    english: 'To win a hand',
    definition:
      'Completing your hand and claiming it, whether off a discard or by drawing the tile yourself. The hand ends the moment someone does this.',
    related: ['zi_mo', 'cheut_chung', 'gai_wu'],
    group: 'play',
  },
  {
    id: 'zi_mo',
    handType: 'zi_mo',
    roman: 'Zi Mo',
    zh: '自摸',
    english: 'Self pick',
    definition:
      'Winning on a tile you drew yourself rather than one someone discarded. Nobody is at fault, so all three losers pay, and at most tables they pay more than they would on a discard.',
    related: ['sik_wu', 'cheut_chung', 'faan'],
    group: 'play',
  },
  {
    id: 'cheut_chung',
    handType: 'ceot_cung',
    roman: 'Cheut Chung',
    zh: '出銃',
    english: 'Shooter',
    definition:
      'The player who discards the tile that completes another player\u2019s winning hand. How much of the win the shooter carries is a house rule: at some tables they pay the full amount alone, at others everyone pays and the shooter pays double. Either way, everyone remembers who it was.',
    related: ['sik_wu', 'zi_mo'],
    group: 'play',
  },
  {
    id: 'zaa_wu',
    handType: 'zaa_wu',
    roman: 'Zaa Wu',
    zh: '詐糊',
    english: 'False win',
    definition:
      'Declaring a win on a hand that is not actually complete, or not worth the table minimum. The offender pays a fixed penalty to each of the other three players.',
    related: ['sik_wu', 'faan'],
    group: 'play',
  },
  {
    id: 'lau_guk',
    handType: 'draw',
    roman: 'Lau Guk',
    zh: '流局',
    english: 'Draw',
    definition:
      'The wall runs out before anyone wins, so the hand is washed out. No money changes hands, and the deal usually stays where it is.',
    related: ['zong', 'lin_zong'],
    group: 'play',
  },
  {
    id: 'zong',
    roman: 'Zong',
    zh: '莊',
    english: 'Dealer',
    definition:
      'The player dealing the current hand, marked in the app with 莊 on their seat. Some tables pay the dealer extra, or charge them extra when they lose.',
    related: ['lin_zong', 'hyun_fung', 'mun_fung'],
    group: 'table',
  },
  {
    id: 'lin_zong',
    roman: 'Lin Zong',
    zh: '連莊',
    english: 'Dealer repeats',
    definition:
      'The dealer wins and so deals again instead of passing it on. A dealer on a run can hold the deal for several hands, which is why the round does not always advance.',
    related: ['zong'],
    group: 'table',
  },
  {
    id: 'hyun_fung',
    roman: 'Hyun Fung',
    zh: '圈風',
    english: 'Round wind',
    definition:
      'The wind the whole table is playing under, shown in the middle of the table. It starts at East and moves on each time the deal returns to the first seat.',
    related: ['mun_fung', 'zong'],
    group: 'table',
  },
  {
    id: 'mun_fung',
    roman: 'Mun Fung',
    zh: '門風',
    english: 'Seat wind',
    definition:
      'The wind belonging to your seat, which stays with you for the whole game in this app. A triplet of your own seat wind is worth an extra faan.',
    related: ['hyun_fung', 'zong'],
    group: 'table',
  },
  {
    id: 'teng_paai',
    roman: 'Teng Paai',
    zh: '聽牌',
    english: 'Ready hand',
    definition:
      'Your hand is one tile away from winning and you are waiting for it. Being ready does not score anything by itself, but it decides who can claim the next useful discard.',
    related: ['sik_wu'],
    group: 'play',
  },
  {
    id: 'pung',
    roman: 'Pung',
    zh: '碰',
    english: 'Claim a triplet',
    definition:
      'Taking a discard to complete a set of three identical tiles, which you then lay face up. Anyone can call it regardless of whose turn is next.',
    related: ['gong', 'soeng'],
    group: 'play',
  },
  {
    id: 'gong',
    roman: 'Gong',
    zh: '槓',
    english: 'Four of a kind',
    definition:
      'A set of all four copies of the same tile. You draw a replacement tile afterwards, so a gong can quietly improve a hand as well as adding value.',
    related: ['pung'],
    group: 'play',
  },
  {
    id: 'soeng',
    roman: 'Soeng',
    zh: '上',
    english: 'Claim a sequence',
    definition:
      'Taking a discard to complete a run of three tiles in the same suit. Only the player to the discarder’s right may do it, which is what makes it weaker than a pung.',
    related: ['pung', 'gong'],
    group: 'play',
  },
  {
    id: 'gai_wu',
    roman: 'Gai Wu',
    zh: '雞糊',
    english: 'Chicken hand',
    definition:
      'A winning hand with no scoring patterns at all, worth the bare minimum. At tables with a faan minimum it cannot be declared, which is where false wins tend to come from.',
    related: ['faan', 'zaa_wu'],
    group: 'scoring',
  },
  {
    id: 'baau_paang',
    roman: 'Baau Paang',
    zh: '爆棚',
    english: 'Hitting the limit',
    definition:
      'A hand worth so much that it pays the table cap rather than its full count. Once you are there, extra faan add nothing, so the cap is the ceiling on any single hand.',
    related: ['faan'],
    group: 'scoring',
  },
];

/** Every pattern in the hand builder is also a glossary entry. */
const FROM_PATTERNS: Term[] = PATTERNS.map((pattern) => ({
  id: `pattern:${pattern.id}`,
  roman: pattern.jyutping,
  zh: pattern.zh,
  english: pattern.nameEn,
  definition: patternDefinition(pattern.id, pattern.faan, pattern.limit),
  group: 'pattern' as const,
  related: ['faan'],
}));

/** Short explanations of what each pattern actually is. */
function patternDefinition(id: string, faan: number, limit?: boolean): string {
  const worth = limit
    ? 'It is a limit hand, so at most tables it pays the cap.'
    : `It is worth ${faan} faan.`;

  const what: Record<string, string> = {
    all_sequences:
      'Every set in the hand is a run of three, with no triplets at all.',
    seat_wind: 'A triplet of the wind belonging to your own seat.',
    round_wind:
      'A triplet of the wind the whole table is currently playing under.',
    dragon_triplet:
      'A triplet of dragons. Each separate dragon triplet counts again.',
    no_flowers:
      'You finished the hand without drawing a single flower or season tile.',
    own_flower:
      'A flower or season tile matching your seat. Each one counts again.',
    self_drawn:
      'You drew the winning tile yourself instead of taking a discard.',
    all_triplets:
      'Every set is three of a kind, with no runs anywhere in the hand.',
    mixed_one_suit: 'One suit only, plus winds and dragons.',
    small_three_dragons: 'Two dragon triplets and a pair of the third.',
    full_flush:
      'The whole hand is a single suit, with no winds or dragons at all.',
    big_three_dragons: 'All three dragons as full triplets.',
    small_four_winds: 'Three wind triplets and a pair of the fourth.',
    all_honors: 'Nothing but winds and dragons, with no numbered tiles.',
    heavenly_hand:
      'The dealer wins on the opening hand, before discarding anything.',
    earthly_hand: 'A non dealer wins on the dealer’s very first discard.',
    thirteen_orphans:
      'One of each terminal and honour tile, plus a second copy of any one of them.',
    big_four_winds: 'All four winds as full triplets.',
    nine_gates:
      'A specific one suit hand that waits on any of the nine tiles in that suit.',
    seven_pairs:
      'Seven separate pairs rather than the usual four sets and a pair.',
    concealed_hand:
      'You never claimed a discard, so the whole hand stayed in your hand.',
    fully_concealed_self_draw:
      'A concealed hand finished on your own draw. It stands in for the concealed hand and the self draw together rather than counting both.',
    single_wait: 'You were waiting on exactly one tile to finish the pair.',
    pair_258: 'Your pair is a two, a five or an eight.',
    all_simples:
      'No ones, no nines, no winds and no dragons anywhere in the hand.',
    lacking_a_suit: 'The hand is missing one of the three suits entirely.',
  };

  return `${what[id] ?? ''} ${worth}`.trim();
}

export const TERMS: Term[] = [...CORE, ...FROM_PATTERNS];

export const TERM_BY_ID: Record<string, Term> = Object.fromEntries(
  TERMS.map((entry) => [entry.id, entry]),
);

export const GROUP_LABELS: Record<Term['group'], string> = {
  play: 'Playing a hand',
  table: 'The table',
  scoring: 'Scoring',
  pattern: 'Patterns',
};

/**
 * Romanisations worth checking. The pattern names have their own list in the
 * catalog; these are the terms that only appear here.
 */
export const TODO_ROMANISATION: { id: string; note: string }[] = [
  {
    id: 'cheut_chung',
    note: 'Spelled the group’s way. Jyutping would be Ceot Cung.',
  },
  {
    id: 'sik_wu',
    note: '食糊 as Sik Wu, matching Zaa Wu. Some write Sik Wu4 or Sik Hu.',
  },
  {
    id: 'teng_paai',
    note: '聽 read colloquially as teng1 rather than ting1. Both are heard at the table.',
  },
  {
    id: 'soeng',
    note: '上 tone uncertain, soeng5 or soeng6. Many tables say the Mandarin chow instead.',
  },
  {
    id: 'gai_wu',
    note: '雞糊 as Gai Wu. Same 糊 question as the other wu terms.',
  },
  {
    id: 'baau_paang',
    note: '爆棚 as Baau Paang. Outside mahjong it just means packed out, so worth confirming this is what your table calls hitting the cap.',
  },
  {
    id: 'lin_zong',
    note: '連莊 as Lin Zong. Some tables count a repeat differently, which the app does not track yet.',
  },
];

/** The four terms that are also a kind of hand, keyed the way the engine keys them. */
export const HAND_TYPE_TERMS = Object.fromEntries(
  TERMS.filter((term) => term.handType).map((term) => [term.handType, term]),
) as Record<HandType, Term>;

/** The term for a kind of hand. The engine stores the id; this says it out loud. */
export function termForHandType(type: HandType): Term {
  return HAND_TYPE_TERMS[type];
}

/** The romanisation of a term, for prose that names it. */
export function romanOf(id: string): string {
  return TERM_BY_ID[id]?.roman ?? id;
}

/** The English gloss of a term, for prose and for labels built around it. */
export function glossOf(id: string): string {
  return TERM_BY_ID[id]?.english ?? id;
}
