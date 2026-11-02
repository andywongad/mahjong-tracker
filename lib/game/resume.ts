/**
 * Which game, if any, home should offer to carry on with.
 *
 * Two rules, both of which are easy to get subtly wrong, so they live here
 * with tests rather than inside a component.
 *
 * The sample game is not one of yours. The app seeds a finished reference game
 * on first run so nothing is ever empty, and calling a game somebody has
 * never played their "current game" would be the first thing they read and
 * would not be true.
 *
 * A complete round is not an ended game. Tables play on past the end of a
 * round with extra hands, and the app only knows play has stopped when
 * somebody settles up. Treating a complete round as finished would hide the
 * game people are in the middle of.
 */
import { SEED_GAME_ID } from './seed';
import type { GameSummary } from './standings';

/**
 * The games this person actually played, newest first.
 *
 * Generic over the record, because both the summaries home reads and the full
 * games the new game sheet is prefilled from have to leave out the sample.
 */
export function playedGames<T extends { id: string }>(games: T[]): T[] {
  return games.filter((game) => game.id !== SEED_GAME_ID);
}

/** The game to offer, or null when there is nothing to carry on with. */
export function resumable(summaries: GameSummary[]): GameSummary | null {
  return playedGames(summaries).find((summary) => !summary.endedEarly) ?? null;
}
