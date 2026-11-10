'use client';

import { useState } from 'react';
import { logEvent } from '@/lib/telemetry/events';
import { parseAlternatives, type Heard } from '@/lib/voice/grammar';
import { useSpeech } from '@/lib/voice/useSpeech';
import { termForHandType } from '@/lib/terms';
import type { Rules } from '@/lib/rules/types';

/**
 * Say the hand instead of tapping it out.
 *
 * This answers the two questions left once a seat has been tapped, and nothing
 * else. It never saves: whatever it hears lands in the sheet as if it had been
 * tapped, the four running totals underneath move, and a person still presses
 * Save. A misheard number is a visible wrong number rather than a wrong score.
 *
 * Absent entirely where the browser has no recogniser, which is the honest
 * answer for Firefox and for a locked-down install. Tapping always works.
 */
export function SayTheHand({
  rules,
  onHeard,
}: {
  rules: Rules;
  onHeard: (heard: Heard) => void;
}) {
  // What the last listen came to: the words understood, or why they were not.
  const [said, setSaid] = useState<string | null>(null);
  const [miss, setMiss] = useState<string | null>(null);

  const speech = useSpeech({
    onHeard: (alternatives) => {
      const parsed = parseAlternatives(alternatives, rules);
      const top = alternatives[0] ?? '';
      if (!parsed.ok) {
        setSaid(null);
        setMiss(parsed.reason);
        // Kept locally so the grammar's phrase lists can grow from what a real
        // table says, rather than from guesses about it.
        logEvent('voice_missed', {
          said: top,
          also: alternatives.slice(1).join(' | ') || null,
        });
        return;
      }
      setMiss(null);
      setSaid(describe(parsed.heard));
      logEvent('voice_heard', {
        type: parsed.heard.type ?? null,
        faan: parsed.heard.faan ?? null,
      });
      onHeard(parsed.heard);
    },
  });

  if (!speech.supported) return null;

  let message: string;
  if (speech.listening) message = 'Listening. Say it once, then stop.';
  else if (speech.error) message = speech.error;
  else if (miss) message = miss;
  else if (said) message = `Heard ${said}.`;
  else message = hint(rules);
  const wrong = !speech.listening && Boolean(speech.error ?? miss);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => {
          if (speech.listening) {
            speech.stop();
            return;
          }
          setSaid(null);
          setMiss(null);
          speech.start();
        }}
        className="touch flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
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
        {speech.listening ? 'Stop listening' : 'Say the hand instead'}
      </button>
      {/* Spoken as it changes, since the point of talking to the app is not
        having to watch it. */}
      <p
        aria-live="polite"
        className="text-xs"
        style={{ color: wrong ? 'var(--accent)' : 'var(--muted)' }}
      >
        {message}
      </p>
    </div>
  );
}

/** What was filled in, in the words the rest of the sheet uses. */
function describe(heard: Heard): string {
  const parts: string[] = [];
  if (heard.type) parts.push(termForHandType(heard.type).roman);
  if (heard.faan !== undefined) parts.push(`${heard.faan} faan`);
  return parts.join(', ');
}

/**
 * One example, built from this table's own minimum, and teaching the whole
 * language in two phrases: a number, or a number with the route it took.
 */
function hint(rules: Rules): string {
  const example = Math.min(rules.minFaan + 2, rules.faanCap);
  return `Try “${example}”, or “self drew ${example}”.`;
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
