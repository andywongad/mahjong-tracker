import { describe, expect, it } from 'vitest';
import { timingOf } from '../stats';

/**
 * The shape of a night, read off the times its hands were written down.
 *
 * Mostly this tests the refusing. A pace is a confident-looking number, and
 * a confident number worked out from half the evidence is worse than no
 * number at all.
 */

const at = (minutes: number) =>
  new Date(Date.UTC(2026, 10, 12, 19, 0) + minutes * 60000).toISOString();
const hands = (...minutes: number[]) =>
  minutes.map((m) => ({ recordedAt: at(m) }));

describe('how long a night ran', () => {
  it('measures from the first hand to the last', () => {
    expect(timingOf(hands(0, 20, 45, 90))?.minutes).toBe(90);
  });

  it('takes the typical gap, not the average one', () => {
    // Ten minutes apart all evening, with one hour long break for food. The
    // mean would call this a 22 minute pace, which no hand was played at.
    const timing = timingOf(hands(0, 10, 20, 80, 90, 100));
    expect(timing?.perHand).toBe(10);
  });

  it('finds the longest pause and the hand it followed', () => {
    expect(timingOf(hands(0, 10, 20, 80))?.longestGap).toEqual({
      minutes: 60,
      afterHand: 3,
    });
  });
});

describe('refusing to measure what it cannot', () => {
  it('says nothing when one hand has no time', () => {
    // Every game played before times existed, and any game that straddles
    // the version that started keeping them. The gaps either side of an
    // untimed hand are two hands wide, which is a quiet way to be wrong.
    const partly = [...hands(0, 10), {}, ...hands(30)];
    expect(timingOf(partly)).toBeNull();
  });

  it('says nothing about a single hand, which has no shape', () => {
    expect(timingOf(hands(0))).toBeNull();
    expect(timingOf([])).toBeNull();
  });

  it('refuses a night that finishes before it starts', () => {
    // Two devices whose clocks disagree. A negative evening is not a fact
    // about mahjong.
    expect(timingOf([{ recordedAt: at(30) }, { recordedAt: at(30) }])).toBeNull();
  });

  it('refuses a timestamp it cannot read', () => {
    expect(timingOf([{ recordedAt: 'tuesday' }, { recordedAt: at(30) }])).toBeNull();
  });

  it('reads hands recorded out of order by sorting them', () => {
    // The log is ordered by seq, not by clock, and an edited hand keeps the
    // time it was first written down.
    expect(timingOf(hands(90, 0, 45, 20))?.minutes).toBe(90);
  });
});
