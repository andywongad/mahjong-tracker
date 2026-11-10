import { describe, expect, it } from 'vitest';
import type { PlayerNames } from '@/lib/scoring';
import { namesIn } from '../names';

/**
 * The matcher's whole claim is that choosing between four known people is a
 * far easier problem than transcribing a name. These pin both halves of it:
 * that a mangled name still lands, and that an unclear one is dropped rather
 * than pinned on whoever came closest.
 */

const TABLE = ['Cal', 'Di', 'Ann', 'Bo'] as unknown as PlayerNames;
const seats = (said: string, players: PlayerNames = TABLE) =>
  namesIn(said.toLowerCase().split(' '), players).map((n) => n.seat);

describe('hearing the four people at the table', () => {
  it('finds names said properly, in the order they were said', () => {
    expect(seats('cal won 6 points from di')).toEqual([0, 1]);
    expect(seats('di self drew 4')).toEqual([1]);
  });

  it('finds a name the recogniser mangled', () => {
    expect(seats('carl won 6 from di')).toEqual([0, 1]);
    expect(seats('cahl won 6')).toEqual([0]);
  });

  it('puts back together a name split into two words', () => {
    // A recogniser breaks up a name it does not know, so the name
    // has to be long enough to be worth breaking.
    const table = ['Marco', 'Di', 'Ann', 'Bo'] as unknown as PlayerNames;
    expect(seats('mar co self drew 4', table)).toEqual([0]);
  });

  it('ignores the words doing a job in the sentence', () => {
    expect(seats('won from off points faan the and')).toEqual([]);
  });

  it('still hears a player named after one of those words', () => {
    const table = ['Drew', 'Di', 'Ann', 'Bo'] as unknown as PlayerNames;
    expect(seats('drew won 6 from di', table)).toEqual([0, 1]);
  });
});

describe('refusing rather than picking the closest', () => {
  it('drops a word that is nobody at this table', () => {
    expect(seats('somebody won 6')).toEqual([]);
    expect(seats('the window is open')).toEqual([]);
  });

  it('needs a mishearing to start with the same sound', () => {
    // Recognisers mangle the middle of a word, not its opening.
    expect(seats('massie won 6')).toEqual([]);
  });

  it('will not choose between two players who sound alike', () => {
    const table = ['Ann', 'Anna', 'Bo', 'Cal'] as unknown as PlayerNames;
    // "anne" is as close to one as the other, so neither is recorded.
    expect(seats('anne won 6', table)).toEqual([]);
  });

  it('still hears an exact name even when a rival is close', () => {
    const table = ['Ann', 'Anna', 'Bo', 'Cal'] as unknown as PlayerNames;
    expect(seats('anna won 6 from bo', table)).toEqual([1, 2]);
  });

  it('reads a name made of two words', () => {
    const table = ['Mary Lou', 'Di', 'Ann', 'Bo'] as unknown as PlayerNames;
    expect(seats('mary lou won 6 from di', table)).toEqual([0, 1]);
    // Either half on its own is still her.
    expect(seats('lou won 6', table)).toEqual([0]);
  });
});
