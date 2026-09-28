/**
 * Scoring patterns for the hand builder.
 *
 * Romanisation is Jyutping, except where the group spells something their own
 * way. Anything uncertain is listed in TODO_ROMANISATION below for checking
 * rather than quietly shipped as fact.
 */

export type PatternSet = 'classic' | 'limit' | 'house' | 'new_six';

export interface Pattern {
  id: string;
  nameEn: string;
  zh: string;
  jyutping: string;
  /** Faan the pattern is worth. Ignored when faanFromRules is set. */
  faan: number;
  set: PatternSet;
  /** A limit hand, which may pay the cap depending on the rules. */
  limit?: boolean;
  /** How many times it can be counted. Absent means a plain on or off. */
  stackable?: number;
  /** Patterns that cannot be held at the same time as this one. */
  excludes?: string[];
  /** Takes its faan from a rule rather than the catalog. */
  faanFromRules?: 'selfDrawBonusFaan';
  /** Only offered when the hand was self drawn. */
  selfDrawOnly?: boolean;
}

export const PATTERNS: Pattern[] = [
  // ---- Classic ----
  {
    id: 'all_sequences',
    nameEn: 'All sequences',
    zh: '平糊',
    jyutping: 'Ping Wu',
    faan: 1,
    set: 'classic',
    excludes: ['all_triplets'],
  },
  {
    id: 'seat_wind',
    nameEn: 'Seat wind',
    zh: '門風',
    jyutping: 'Mun Fung',
    faan: 1,
    set: 'classic',
  },
  {
    id: 'round_wind',
    nameEn: 'Round wind',
    zh: '圈風',
    jyutping: 'Hyun Fung',
    faan: 1,
    set: 'classic',
  },
  {
    id: 'dragon_triplet',
    nameEn: 'Dragon triplet',
    zh: '番牌',
    jyutping: 'Faan Paai',
    faan: 1,
    set: 'classic',
    stackable: 3,
  },
  {
    id: 'no_flowers',
    nameEn: 'No flowers',
    zh: '無花',
    jyutping: 'Mou Faa',
    faan: 1,
    set: 'classic',
    excludes: ['own_flower'],
  },
  {
    id: 'own_flower',
    nameEn: 'Own flower',
    zh: '正花',
    jyutping: 'Zing Faa',
    faan: 1,
    set: 'classic',
    stackable: 2,
    excludes: ['no_flowers'],
  },
  {
    id: 'self_drawn',
    nameEn: 'Self drawn',
    zh: '自摸',
    jyutping: 'Zi Mo',
    faan: 0,
    faanFromRules: 'selfDrawBonusFaan',
    set: 'classic',
    selfDrawOnly: true,
    excludes: ['fully_concealed_self_draw'],
  },
  {
    id: 'all_triplets',
    nameEn: 'All triplets',
    zh: '對對糊',
    jyutping: 'Deoi Deoi Wu',
    faan: 3,
    set: 'classic',
    excludes: ['all_sequences'],
  },
  {
    id: 'mixed_one_suit',
    nameEn: 'Mixed one suit',
    zh: '混一色',
    jyutping: 'Wan Jat Sik',
    faan: 3,
    set: 'classic',
    excludes: ['full_flush', 'all_honors'],
  },
  {
    id: 'small_three_dragons',
    nameEn: 'Small three dragons',
    zh: '小三元',
    jyutping: 'Siu Saam Jyun',
    faan: 5,
    set: 'classic',
    excludes: ['big_three_dragons'],
  },
  {
    id: 'full_flush',
    nameEn: 'Full flush',
    zh: '清一色',
    jyutping: 'Cing Jat Sik',
    faan: 7,
    set: 'classic',
    excludes: ['mixed_one_suit', 'all_honors'],
  },

  // ---- Limit hands ----
  {
    id: 'big_three_dragons',
    nameEn: 'Big three dragons',
    zh: '大三元',
    jyutping: 'Daai Saam Jyun',
    faan: 8,
    set: 'limit',
    limit: true,
    excludes: ['small_three_dragons'],
  },
  {
    id: 'small_four_winds',
    nameEn: 'Small four winds',
    zh: '小四喜',
    jyutping: 'Siu Sei Hei',
    faan: 10,
    set: 'limit',
    limit: true,
    excludes: ['big_four_winds'],
  },
  {
    id: 'all_honors',
    nameEn: 'All honours',
    zh: '字一色',
    jyutping: 'Zi Jat Sik',
    faan: 10,
    set: 'limit',
    limit: true,
    excludes: ['mixed_one_suit', 'full_flush'],
  },
  {
    id: 'heavenly_hand',
    nameEn: 'Heavenly hand',
    zh: '天糊',
    jyutping: 'Tin Wu',
    faan: 10,
    set: 'limit',
    limit: true,
    excludes: ['earthly_hand'],
  },
  {
    id: 'earthly_hand',
    nameEn: 'Earthly hand',
    zh: '地糊',
    jyutping: 'Dei Wu',
    faan: 10,
    set: 'limit',
    limit: true,
    excludes: ['heavenly_hand'],
  },
  {
    id: 'thirteen_orphans',
    nameEn: 'Thirteen orphans',
    zh: '十三么',
    jyutping: 'Sap Saam Jiu',
    faan: 13,
    set: 'limit',
    limit: true,
  },
  {
    id: 'big_four_winds',
    nameEn: 'Big four winds',
    zh: '大四喜',
    jyutping: 'Daai Sei Hei',
    faan: 15,
    set: 'limit',
    limit: true,
    excludes: ['small_four_winds'],
  },
  {
    id: 'nine_gates',
    nameEn: 'Nine gates',
    zh: '九蓮寶燈',
    jyutping: 'Gau Lin Bou Dang',
    faan: 15,
    set: 'limit',
    limit: true,
  },

  // ---- House rule, off unless switched on ----
  {
    id: 'seven_pairs',
    nameEn: 'Seven pairs',
    zh: '七對子',
    jyutping: 'Cat Deoi Zi',
    faan: 4,
    set: 'house',
  },

  // ---- New 6, shown when the rules ask for them ----
  {
    id: 'concealed_hand',
    nameEn: 'Concealed hand',
    zh: '門前清',
    jyutping: 'Mun Cin Cing',
    faan: 1,
    set: 'new_six',
    excludes: ['fully_concealed_self_draw'],
  },
  {
    id: 'fully_concealed_self_draw',
    nameEn: 'Fully concealed self draw',
    zh: '門前清自摸',
    jyutping: 'Mun Cin Cing Zi Mo',
    faan: 3,
    set: 'new_six',
    selfDrawOnly: true,
    // Stands in for the concealed hand and the self draw together.
    excludes: ['concealed_hand', 'self_drawn'],
  },
  {
    id: 'single_wait',
    nameEn: 'Single wait',
    zh: '單釣',
    jyutping: 'Daan Diu',
    faan: 1,
    set: 'new_six',
  },
  {
    id: 'pair_258',
    nameEn: '258 pair',
    zh: '二五八將',
    jyutping: 'Ji Ng Baat Zoeng',
    faan: 1,
    set: 'new_six',
  },
  {
    id: 'all_simples',
    nameEn: 'All simples',
    zh: '斷幺九',
    jyutping: 'Tyun Jiu Gau',
    faan: 1,
    set: 'new_six',
  },
  {
    id: 'lacking_a_suit',
    nameEn: 'Lacking a suit',
    zh: '缺一門',
    jyutping: 'Kyut Jat Mun',
    faan: 1,
    set: 'new_six',
  },
];

export const PATTERNS_BY_ID: Record<string, Pattern> = Object.fromEntries(
  PATTERNS.map((pattern) => [pattern.id, pattern]),
);

/**
 * Romanisations to check before anyone relies on them.
 *
 * These are the ones with a real chance of being wrong, usually a tone or a
 * reading that varies between tables. Everything not listed here is
 * straightforward Jyutping.
 */
export const TODO_ROMANISATION: { id: string; note: string }[] = [
  {
    id: 'all_sequences',
    note: '糊 is written wu2 here to match Zaa Wu. Some write it wu4, and some tables say Ping Wu, others Ping Hu.',
  },
  {
    id: 'all_triplets',
    note: '對對糊 as Deoi Deoi Wu. Widely said Dui Dui Wu, which is Mandarin influenced.',
  },
  {
    id: 'dragon_triplet',
    note: '番牌 as Faan Paai. Sometimes Fan Pai, and some tables call dragons 三元牌 instead.',
  },
  {
    id: 'thirteen_orphans',
    note: '么 read as jiu1. Also written 十三幺 and said Sap Saam Jiu or Sap Saam Yiu.',
  },
  {
    id: 'pair_258',
    note: '將 tone uncertain: zoeng1 or zoeng3. Written here as Zoeng.',
  },
  {
    id: 'all_simples',
    note: '斷 as tyun5. Some render the whole name Tyun Jiu Gau, others Dyun Jiu Gau.',
  },
  {
    id: 'self_drawn',
    note: 'Kept as Zi Mo to match the rest of the app.',
  },
];
