'use client';

import { useState } from 'react';
import { logEvent } from '@/lib/telemetry/events';
import { parseTableAlternatives, type HeardHand } from '@/lib/voice/grammar';
import { useSpeech } from '@/lib/voice/useSpeech';
import type { PlayerNames } from '@/lib/scoring';
import type { Rules } from '@/lib/rules/types';

/**
 * Say the whole hand, from the table, with nothing tapped first.
 *
 * "Cal won 6 points from Di" is every question the sheet would have
 * asked. A sentence that answers all of them is recorded the way a draw and a
 * false win already are: straight down, with a few seconds to take it back. A
 * sentence that answers only some opens the sheet with what was heard already
 * filled in, which is still most of the work done.
 *
 * The caller decides which of those happens, because the caller owns both.
 */
export function SpeakHand({
  players,
  rules,
  onHeard,
}: {
  players: PlayerNames;
  rules: Rules;
  /** Given everything the sentence said. Returns what to tell the table. */
  onHeard: (heard: HeardHand) => string | null;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);

  const speech = useSpeech({
    onHeard: (alternatives) => {
      const parsed = parseTableAlternatives(alternatives, players, rules);
      const top = alternatives[0] ?? '';
      if (!parsed.ok) {
        setWrong(true);
        setNote(parsed.reason);
        // Every guess, not just the best one. The lists grow from what the
        // recogniser actually offered, and the runners-up are where a name
        // it dropped from the top guess usually turns up.
        logEvent('voice_missed', {
          said: top,
          also: alternatives.slice(1).join(' | ') || null,
        });
        return;
      }
      setWrong(false);
      logEvent('voice_heard', { where: 'table' });
      setNote(onHeard(parsed.heard));
    },
  });

  if (!speech.supported) return null;

  let message: string;
  if (speech.listening) message = 'Listening. Say the hand, then stop.';
  else if (speech.error) message = speech.error;
  else if (note) message = note;
  else message = hint(players, rules);
  const red = !speech.listening && (Boolean(speech.error) || wrong);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => {
          if (speech.listening) {
            speech.stop();
            return;
          }
          setNote(null);
          setWrong(false);
          speech.start();
        }}
        className="touch flex w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
        style={
          speech.listening
            ? { background: 'var(--accent)', color: '#fff' }
            : {
                background: 'var(--tile-face)',
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
              }
        }
      >
        <MicIcon />
        {speech.listening ? 'Stop listening' : 'Say the hand'}
      </button>
      <p
        aria-live="polite"
        className="px-1 text-xs"
        style={{ color: red ? 'var(--accent)' : 'var(--muted)' }}
      >
        {message}
      </p>
    </div>
  );
}

/**
 * One example, in this table's own names and its own numbers, because the
 * sentence to copy is the whole instruction.
 *
 * No "won" in it, deliberately. Every failure in the misses log was that one
 * word: the recogniser hears it as a one, runs it into the number after it
 * ("won 6" came back as "16"), and often takes the name in front of it down
 * too. Dropping the verb costs nothing - the first name said is the winner
 * either way - and it is the single biggest thing that makes this work.
 */
function hint(players: PlayerNames, rules: Rules): string {
  const faan = Math.min(rules.minFaan + 2, rules.faanCap);
  return `Try “${players[0]} ${faan} from ${players[1]}”, without “won”.`;
}

/** A microphone, at the 16px weight the header icons are drawn to. */
function MicIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5.5 11.5V12a6.5 6.5 0 0 0 13 0v-.5" />
      <path d="M12 18.5V21" />
    </svg>
  );
}
