/**
 * The two or three things about a game worth saying out loud.
 *
 * Every number here is already computed by the stats pass; nothing new is
 * measured and nothing new is stored, so this works on games played long
 * before it existed. What it adds is editorial: which of the forty facts on
 * the stats screen are worth a sentence, for this particular night.
 *
 * Two rules hold the whole thing up.
 *
 * Each candidate carries its own threshold, rather than the section being
 * gated on a hand count. A limit hand on hand three is a story; a two hand
 * winning streak is not, however long the game ran. So a six hand game can
 * still yield one true line, and a four hand game yields none and the section
 * does not appear. One true line beats three padded ones.
 *
 * And nothing here repeats what the screen below already shows plainly. The
 * summary table says who won; this says they were sixty up at hand nine and
 * gave it all back, which the table cannot.
 */
import { PATTERNS_BY_ID } from '@/lib/patterns/catalog';
import type { FeedEntry, PlayerStats, StatsResult } from '@/lib/scoring';

export interface Highlight {
  /** Which kind it is, so a test can ask for one by name. */
  id: string;
  /** The sentence, ready to read. */
  text: string;
  /**
   * How much it is worth saying, 0 to 100. Comparable across kinds, so the
   * night's real story beats a merely true remark about it.
   */
  weight: number;
}

/** How many make it to the screen. More than this and it stops being a story. */
const KEEP = 4;

/** Hands before the score has had room to move and come back. */
const ENOUGH_FOR_A_SHAPE = 10;
/** Hands before never dealing in says something about a player. */
const ENOUGH_FOR_A_CLEAN_SHEET = 12;

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/** What a built hand was made of, in words. */
function patternNames(patterns: { id: string; count: number }[]): string {
  const names = patterns
    .map((pattern) => PATTERNS_BY_ID[pattern.id]?.nameEn ?? pattern.id)
    .filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Who finished on top, and by how much. */
function result(players: PlayerStats[]): Highlight | null {
  if (players.length === 0) return null;
  const ordered = [...players].sort((a, b) => b.score - a.score);
  const [first, second] = ordered;
  if (!second) return null;

  const level = ordered.filter((player) => player.score === first.score);
  if (level.length > 1) {
    const names = level.map((player) => player.name);
    return {
      id: 'tied',
      weight: 100,
      text: `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} finished level on ${signed(first.score)}.`,
    };
  }

  return {
    id: 'result',
    weight: 100,
    text: `${first.name} took the night on ${signed(first.score)}, ${first.score - second.score} clear of ${second.name}.`,
  };
}

/** Up at the top of the night, and what was left of it by the end. */
function gaveBack(player: PlayerStats, handCount: number): Highlight | null {
  const { high, highAtHand, gaveBack: given } = player.swing;
  if (handCount < ENOUGH_FOR_A_SHAPE) return null;
  if (high <= 0 || given < 20) return null;

  return {
    id: 'gave-back',
    weight: 40 + Math.min(given, 100) / 2,
    text: `${player.name} was ${signed(high)} after hand ${highAtHand} and finished on ${signed(player.score)}.`,
  };
}

/** The climb out of a hole. */
function comeback(player: PlayerStats, handCount: number): Highlight | null {
  const { bestRun, bestRunFromHand } = player.swing;
  if (handCount < ENOUGH_FOR_A_SHAPE || bestRun < 20) return null;

  return {
    id: 'comeback',
    weight: 38 + Math.min(bestRun, 100) / 2,
    text: `${player.name} climbed ${bestRun} from hand ${bestRunFromHand}.`,
  };
}

/** Who fed whom, where it happened often enough to be a pattern. */
function feeding(feed: FeedEntry[], players: PlayerStats[]): Highlight | null {
  const worst = [...feed].sort((a, b) => b.hands - a.hands || b.points - a.points)[0];
  if (!worst || worst.hands < 3) return null;

  const shooter = players.find((player) => player.seat === worst.shooterSeat);
  const winner = players.find((player) => player.seat === worst.winnerSeat);
  if (!shooter || !winner) return null;

  return {
    id: 'feeding',
    weight: 30 + worst.hands * 5,
    text: `${shooter.name} fed ${winner.name} ${worst.hands} times, ${worst.points} points of it.`,
  };
}

/** Everything that is true of one player on their own. */
function forPlayer(player: PlayerStats, handCount: number): Highlight[] {
  const found: Highlight[] = [];

  const slide = gaveBack(player, handCount);
  if (slide) found.push(slide);

  const climb = comeback(player, handCount);
  if (climb) found.push(climb);

  if (player.biggestHand > 0) {
    found.push({
      id: 'biggest-hand',
      weight: 30 + Math.min(player.biggestHand, 120) / 4,
      text: `The biggest hand of the night was ${player.biggestHand}, to ${player.name}.`,
    });
  }

  if (player.signatureHand && player.signatureHand.patterns.length > 0) {
    const { faan, patterns, isLimit } = player.signatureHand;
    const made = patternNames(patterns);
    if (made && (faan >= 5 || isLimit)) {
      found.push({
        id: 'signature-hand',
        weight: 25 + faan * 2,
        text: `${player.name} built the best hand of the night: ${made}, ${faan} faan.`,
      });
    }
  }

  // Three is a run. Two happens to everybody.
  if (player.longestWinStreak >= 3) {
    found.push({
      id: 'streak',
      weight: 30 + player.longestWinStreak * 5,
      text: `${player.name} won ${player.longestWinStreak} hands in a row.`,
    });
  }

  // Needs enough wins that the share means something.
  if (player.wins >= 4 && player.ziMoShare >= 0.5) {
    found.push({
      id: 'self-drawn',
      weight: 25 + player.ziMo * 2,
      text: `${player.ziMo} of ${player.name}'s ${player.wins} wins were self drawn.`,
    });
  }

  if (player.ceotCung === 0 && handCount >= ENOUGH_FOR_A_CLEAN_SHEET) {
    found.push({
      id: 'never-dealt-in',
      weight: 35,
      text: `${player.name} never dealt in.`,
    });
  }

  if (player.zaaWu > 0) {
    found.push({
      id: 'false-win',
      weight: 20,
      text:
        player.zaaWu === 1
          ? `${player.name} called a false win.`
          : `${player.name} called ${player.zaaWu} false wins.`,
    });
  }

  return found;
}

/**
 * The night in a few lines, most notable first.
 *
 * Empty when there is nothing worth saying, which is a real answer and not a
 * failure: a game of four hands has no story in it.
 */
export function highlights(summary: StatsResult): Highlight[] {
  const { players, feed, handCount, totals } = summary;
  if (handCount === 0) return [];

  const found: Highlight[] = [];

  const outcome = result(players);
  if (outcome) found.push(outcome);

  for (const player of players) found.push(...forPlayer(player, handCount));

  const fed = feeding(feed, players);
  if (fed) found.push(fed);

  if (totals.draws >= 2) {
    found.push({
      id: 'draws',
      weight: 10 + totals.draws,
      text: `${totals.draws} hands washed out.`,
    });
  }

  // Only the best of each kind: two players both having a good run is one
  // fact about the night, not two.
  const bestOfKind = new Map<string, Highlight>();
  for (const highlight of found) {
    const held = bestOfKind.get(highlight.id);
    if (!held || highlight.weight > held.weight) {
      bestOfKind.set(highlight.id, highlight);
    }
  }

  return [...bestOfKind.values()]
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, KEEP);
}
