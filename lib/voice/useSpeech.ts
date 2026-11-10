'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * Push to talk over the browser's own recogniser.
 *
 * Push to talk rather than always listening, for three reasons that all point
 * the same way: a mahjong table is a wall of shuffling tiles and four people
 * talking, nobody wants a phone listening to their evening, and an open
 * microphone costs battery all night. Holding a button also tells the
 * recogniser exactly which second of audio matters.
 *
 * Every guess is handed on, not just the best one, because the record sheet
 * knows which guesses are even sentences - see parseAlternatives.
 */

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { length: number }>;
}

type Ctor = new () => RecognitionLike;

/** Whether a recogniser exists cannot change under us, so there is nothing to
  subscribe to. */
const noSubscribe = () => () => {};

function constructorFor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: Ctor;
    webkitSpeechRecognition?: Ctor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * What went wrong, in words for somebody mid-game rather than the spec's own.
 * A cancelled listen says nothing at all, because the scorekeeper already
 * knows they let go.
 */
function messageFor(error: string): string | null {
  switch (error) {
    case 'aborted':
      return null;
    case 'no-speech':
      return 'I did not hear anything.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'The microphone is blocked. Allow it for this site, or tap the number.';
    case 'audio-capture':
      return 'No microphone to listen with.';
    case 'network':
      // The honest one. The rest of the app works with no signal; this part
      // of the browser does not.
      return 'Voice needs a connection. Tap the number instead.';
    default:
      return 'The microphone stopped. Tap the number instead.';
  }
}

export interface Speech {
  /** Whether this browser has a recogniser at all. Firefox does not. */
  supported: boolean;
  listening: boolean;
  /** The last failure worth showing, cleared by the next listen. */
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeech({
  onHeard,
  lang = 'en-US',
}: {
  /** Every guess the recogniser offered, best first. */
  onHeard: (alternatives: string[]) => void;
  lang?: string;
}): Speech {
  // Whether a recogniser exists at all. Read through a store rather than an
  // effect, because the server has no window: the first client render has to
  // agree with it, and then correct itself.
  const available = useSyncExternalStore(
    noSubscribe,
    () => constructorFor() !== null,
    () => false,
  );
  // Set when the recogniser exists but will not start, which is rare enough
  // to be worth treating as simply not having one.
  const [broken, setBroken] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<RecognitionLike | null>(null);
  // Read inside the recogniser's callbacks, which outlive the render that set
  // them up.
  const heard = useRef(onHeard);
  useEffect(() => {
    heard.current = onHeard;
  }, [onHeard]);

  // A listen in progress must not survive the sheet closing.
  useEffect(
    () => () => {
      recognition.current?.abort();
      recognition.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = constructorFor();
    if (!Ctor) return;
    recognition.current?.abort();
    setError(null);

    let next: RecognitionLike;
    try {
      next = new Ctor();
    } catch {
      setBroken(true);
      return;
    }
    next.lang = lang;
    // One phrase, no running commentary: the scorekeeper says the hand and the
    // sheet fills in.
    next.continuous = false;
    next.interimResults = false;
    // More guesses than a transcript needs, because a closed language can
    // throw most of them away.
    next.maxAlternatives = 6;

    next.onresult = (event) => {
      const result = event.results[event.resultIndex] ?? event.results[0];
      if (!result) return;
      const alternatives: string[] = [];
      for (let index = 0; index < result.length; index += 1) {
        const transcript = result[index]?.transcript;
        if (transcript) alternatives.push(transcript);
      }
      if (alternatives.length > 0) heard.current(alternatives);
    };
    next.onerror = (event) => {
      const message = messageFor(event.error);
      if (message) setError(message);
      setListening(false);
    };
    next.onend = () => {
      setListening(false);
    };

    recognition.current = next;
    try {
      next.start();
      setListening(true);
    } catch {
      // Already running, which is only reachable by racing the button.
      setListening(false);
    }
  }, [lang]);

  return { supported: available && !broken, listening, error, start, stop };
}
