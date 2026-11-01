/**
 * Reconciling two copies of the same game.
 *
 * Two devices can both be offline and both record into the same game, so
 * there has to be a rule for putting them back together. These are the rules,
 * kept pure and tested, because the cost of getting them wrong is somebody's
 * night of mahjong quietly coming out at the wrong number.
 *
 * The governing principle is that a hand is never dropped. Without a tombstone
 * there is no way to tell "added here" from "deleted there", and the two
 * mistakes are not equal: a hand that appears twice is visible, sits in the
 * log, and takes one tap to remove, while a hand that vanishes changes every
 * score after it and says nothing. So the hands are a union, and the duplicate
 * is the failure mode we choose.
 *
 * Everything else about a game — who played, the house rules, whether it was
 * called early — is a single value rather than a list, so the later edit wins.
 */
import type { GameRecord, HandRecord } from '@/lib/game/types';

/** Which copy was written last. Ties go to the local one, which is on screen. */
function newer(local: GameRecord, remote: GameRecord): GameRecord {
  return remote.updatedAt > local.updatedAt ? remote : local;
}

/**
 * One game from two copies of it.
 *
 * Hands are keyed by id, which is assigned once when a hand is recorded and
 * never changes, so the same hand seen by both devices lands on itself rather
 * than being counted twice.
 */
export function mergeGames(local: GameRecord, remote: GameRecord): GameRecord {
  const lead = newer(local, remote);
  const follow = lead === local ? remote : local;

  const byId = new Map<string, HandRecord>();
  // The older copy goes in first so the newer one overwrites it where both
  // hold the same hand: an edited faan on the later device is the live one.
  for (const hand of follow.hands) byId.set(hand.id, hand);
  for (const hand of lead.hands) byId.set(hand.id, hand);

  const hands = [...byId.values()]
    // Their own order first, then by id so the result never depends on which
    // device happened to sync first.
    .sort((a, b) => (a.seq === b.seq ? (a.id < b.id ? -1 : 1) : a.seq - b.seq))
    // A union can leave gaps and repeats in seq, and seq is what the game is
    // read in order by, so it is handed out again from scratch.
    .map((hand, index) => ({ ...hand, seq: index }));

  return {
    ...lead,
    hands,
    // The merged game is newer than either copy of it, or the next sync would
    // think it had nothing to say.
    updatedAt:
      local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt,
    createdAt:
      local.createdAt < remote.createdAt ? local.createdAt : remote.createdAt,
  };
}

/**
 * Whether a copy says anything the other does not.
 *
 * Used to avoid writing a game back that came down unchanged, which would
 * bump updatedAt and hand the next device a change that is not one.
 */
export function sameGame(a: GameRecord, b: GameRecord): boolean {
  if (a.hands.length !== b.hands.length) return false;
  if (a.updatedAt !== b.updatedAt) return false;
  return a.hands.every((hand, index) => {
    const other = b.hands[index];
    return (
      other !== undefined &&
      hand.id === other.id &&
      hand.seq === other.seq &&
      JSON.stringify(hand) === JSON.stringify(other)
    );
  });
}
