import { describe, expect, it } from 'vitest';
import { summarise, type LoggedEvent } from '../events';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

function at(
  seconds: number,
  name: LoggedEvent['name'],
  detail?: LoggedEvent['detail'],
): LoggedEvent {
  return { name, at: seconds * SECOND, detail };
}

describe('summarise', () => {
  it('reports nothing from an empty log', () => {
    const summary = summarise([]);
    expect(summary.handsRecorded).toBe(0);
    expect(summary.medianSecondsToSave).toBeNull();
    expect(summary.correctionsPerTwentyHands).toBeNull();
  });

  it('takes the median of the gaps between starting and saving', () => {
    const events = [
      at(0, 'record_started'),
      at(4, 'record_saved'),
      at(10, 'record_started'),
      at(20, 'record_saved'),
      at(30, 'record_started'),
      at(36, 'record_saved'),
    ];
    // Gaps of 4, 10 and 6 seconds.
    expect(summarise(events).medianSecondsToSave).toBe(6);
    expect(summarise(events).handsRecorded).toBe(3);
  });

  it('does not count a save against an attempt that was abandoned first', () => {
    const events = [
      at(0, 'record_started'),
      at(5, 'record_abandoned', { step: 'faan' }),
      at(100, 'record_saved'),
    ];
    const summary = summarise(events);
    expect(summary.medianSecondsToSave).toBeNull();
    expect(summary.abandoned).toBe(1);
    expect(summary.abandonedAtStep).toEqual({ faan: 1 });
  });

  it('counts an edit close behind a save as a correction', () => {
    const events = [
      at(0, 'record_started'),
      at(5, 'record_saved'),
      { name: 'hand_edited' as const, at: 5 * SECOND + MINUTE },
    ];
    const summary = summarise(events);
    expect(summary.correctionsWithin2Min).toBe(1);
    expect(summary.correctionsPerTwentyHands).toBe(20);
  });

  it('ignores an edit long after the save it follows', () => {
    const events = [
      at(0, 'record_started'),
      at(5, 'record_saved'),
      { name: 'hand_edited' as const, at: 5 * SECOND + 3 * MINUTE },
    ];
    expect(summarise(events).correctionsWithin2Min).toBe(0);
  });

  it('never credits a correction to a save that came after it', () => {
    const events = [
      { name: 'hand_deleted' as const, at: 0 },
      at(30, 'record_started'),
      at(35, 'record_saved'),
    ];
    expect(summarise(events).correctionsWithin2Min).toBe(0);
  });
});
