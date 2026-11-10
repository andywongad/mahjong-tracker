'use client';

/**
 * A local event log, for judging whether the design changes actually helped.
 *
 * Everything stays in this browser. Nothing is sent anywhere, there is no third
 * party, and the whole log can be exported or cleared by hand. It exists to
 * answer two questions from the review: how long does recording a hand take,
 * and how often does a hand need correcting afterwards.
 */

export type EventName =
  | 'record_started'
  | 'record_saved'
  | 'record_abandoned'
  | 'hand_edited'
  | 'hand_deleted'
  | 'undo_used';

export interface LoggedEvent {
  name: EventName;
  at: number;
  /** Small, non-identifying extras: the step reached, the hand type, and so on. */
  detail?: Record<string, string | number | boolean | null>;
}

const KEY = 'mahjong-events';
/** Enough for several nights; old events fall off the front. */
const LIMIT = 2000;

function read(): LoggedEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LoggedEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: LoggedEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-LIMIT)));
  } catch {
    // A full or blocked store must never interrupt a game.
  }
}

export function logEvent(
  name: EventName,
  detail?: LoggedEvent['detail'],
): void {
  if (typeof window === 'undefined') return;
  write([...read(), { name, at: Date.now(), detail }]);
}

export function allEvents(): LoggedEvent[] {
  return read();
}

export function clearEvents(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do; the log is best effort.
  }
}

export interface Summary {
  handsRecorded: number;
  /** Median seconds from starting a hand to saving it. The review's target is 6. */
  medianSecondsToSave: number | null;
  /** Hands edited or deleted within two minutes of saving: a proxy for mistakes. */
  correctionsWithin2Min: number;
  correctionsPerTwentyHands: number | null;
  undos: number;
  abandoned: number;
  /** Where abandoned attempts stopped, so a step that loses people is visible. */
  abandonedAtStep: Record<string, number>;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** Turn the raw log into the handful of numbers worth looking at. */
export function summarise(events: LoggedEvent[] = allEvents()): Summary {
  const durations: number[] = [];
  const saves: number[] = [];
  let openedAt: number | null = null;
  let undos = 0;
  let abandoned = 0;
  const abandonedAtStep: Record<string, number> = {};

  for (const event of events) {
    switch (event.name) {
      case 'record_started':
        openedAt = event.at;
        break;
      case 'record_saved':
        if (openedAt !== null) durations.push((event.at - openedAt) / 1000);
        saves.push(event.at);
        openedAt = null;
        break;
      case 'record_abandoned': {
        abandoned += 1;
        const step = String(event.detail?.step ?? 'unknown');
        abandonedAtStep[step] = (abandonedAtStep[step] ?? 0) + 1;
        openedAt = null;
        break;
      }
      case 'undo_used':
        undos += 1;
        break;
      default:
        break;
    }
  }

  // A correction is an edit or delete close behind a save.
  const TWO_MINUTES = 2 * 60 * 1000;
  const corrections = events.filter(
    (event) =>
      (event.name === 'hand_edited' || event.name === 'hand_deleted') &&
      saves.some(
        (savedAt) =>
          event.at - savedAt >= 0 && event.at - savedAt <= TWO_MINUTES,
      ),
  ).length;

  return {
    handsRecorded: saves.length,
    medianSecondsToSave: median(durations),
    correctionsWithin2Min: corrections,
    correctionsPerTwentyHands:
      saves.length > 0 ? (corrections / saves.length) * 20 : null,
    undos,
    abandoned,
    abandonedAtStep,
  };
}
