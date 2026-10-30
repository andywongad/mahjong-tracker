'use client';

/**
 * Take a photo of the hand and have the tiles read off it.
 *
 * The scan never scores anything. It fills the tray in and hands the player
 * back control: they check it against the table, take out what is wrong and
 * add what was missed, and the solver and the rules engine do what they
 * always did. A faan from a photo would be a guess dressed as a count.
 *
 * Everything here degrades to nothing. No server, no network, the flag off,
 * out of scans: the button is simply not there, and tapping the tiles in by
 * hand — which is the path that has always worked — is unaffected.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BonusKey, TileKey } from '@/lib/tiles';
import {
  downscale,
  fetchScanConfig,
  photoChoice,
  postPhoto,
  postScan,
  setPhotoChoice,
  type ScanConfigResponse,
  type ScanFailure,
  type ScanResult,
} from '@/lib/scan/client';
import { turnstileToken } from '@/lib/scan/turnstile-client';

/** Below this many left, the number is worth saying. Above it, it is noise. */
const SHOW_REMAINING_AT = 10;

type Phase =
  | { state: 'idle' }
  | { state: 'reading' }
  | { state: 'failed'; failure: ScanFailure };

export function ScanHand({
  onScanned,
  disabled = false,
}: {
  onScanned: (
    result: ScanResult & { tiles: TileKey[]; flowers: BonusKey[] },
  ) => void;
  disabled?: boolean;
}) {
  const [config, setConfig] = useState<ScanConfigResponse | null>(null);
  const [phase, setPhase] = useState<Phase>({ state: 'idle' });
  const [askPhoto, setAskPhoto] = useState<{ scanId: string; image: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchScanConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  const scan = useCallback(
    async (file: File) => {
      setPhase({ state: 'reading' });
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { base64 } = await downscale(file);

        // Only ask Cloudflare for a token where one is wanted. On a developer
        // machine, and for an admin, the server does not look for one.
        let token: string | null = null;
        if (config?.turnstileSiteKey) {
          token = await turnstileToken(config.turnstileSiteKey);
          if (!token) {
            setPhase({ state: 'failed', failure: { kind: 'error' } });
            return;
          }
        }
        if (controller.signal.aborted) return;

        const response = await postScan({
          image: base64,
          turnstileToken: token,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (!response.ok) {
          setPhase({ state: 'failed', failure: response.failure });
          if (response.failure.kind === 'capped')
            setConfig((previous) => (previous ? { ...previous, remaining: 0 } : previous));
          return;
        }

        setPhase({ state: 'idle' });
        setConfig((previous) =>
          previous ? { ...previous, remaining: response.result.remaining } : previous,
        );
        onScanned(response.result);

        // The photo is a separate favour, asked once and remembered.
        const choice = photoChoice();
        if (choice === 'share') void postPhoto(response.result.scanId, base64);
        else if (choice === 'unasked')
          setAskPhoto({ scanId: response.result.scanId, image: base64 });
      } catch {
        if (!controller.signal.aborted)
          setPhase({ state: 'failed', failure: { kind: 'error' } });
      } finally {
        abortRef.current = null;
      }
    },
    [config, onScanned],
  );

  if (!config?.enabled) return null;

  const remaining = config.remaining ?? Infinity;
  const outOfScans = remaining <= 0;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // Opens the back camera on a phone rather than the photo library.
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same photo twice still fires a change.
          event.target.value = '';
          if (file) void scan(file);
        }}
      />

      {phase.state === 'reading' ? (
        <div className="flex items-center justify-between gap-3">
          <span
            className="flex items-center gap-2 text-sm"
            role="status"
            aria-live="polite"
          >
            <Spinner />
            Reading tiles&hellip;
          </span>
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              setPhase({ state: 'idle' });
            }}
            className="touch px-2 text-xs font-semibold underline underline-offset-2"
            style={{ color: 'var(--accent)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || outOfScans}
          onClick={() => inputRef.current?.click()}
          className="touch flex w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold"
          style={
            outOfScans
              ? { background: 'var(--line)', color: 'var(--muted)', cursor: 'not-allowed' }
              : { background: 'var(--tile-face)', border: '1px solid var(--line-strong)' }
          }
        >
          <CameraIcon />
          Scan hand <span style={{ color: 'var(--muted)' }}>(beta)</span>
        </button>
      )}

      {phase.state === 'failed' && (
        <p className="text-xs" role="status" style={{ color: 'var(--loss)' }}>
          {messageFor(phase.failure)}
        </p>
      )}

      {phase.state !== 'failed' && outOfScans && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          You&rsquo;ve used today&rsquo;s scans. You can still tap the tiles in.
        </p>
      )}

      {phase.state === 'idle' &&
        !outOfScans &&
        Number.isFinite(remaining) &&
        remaining <= SHOW_REMAINING_AT && (
          <p className="tnum text-xs" style={{ color: 'var(--muted)' }}>
            {remaining} {remaining === 1 ? 'scan' : 'scans'} left today
          </p>
        )}

      {askPhoto && (
        <PhotoConsent
          onChoose={(choice) => {
            setPhotoChoice(choice);
            if (choice === 'share') void postPhoto(askPhoto.scanId, askPhoto.image);
            setAskPhoto(null);
          }}
        />
      )}
    </div>
  );
}

function messageFor(failure: ScanFailure): string {
  switch (failure.kind) {
    case 'capped':
      return failure.reason === 'global'
        ? 'Scanning is paused for today while we keep an eye on costs. You can still tap the tiles in.'
        : "You've used today's scans. You can still tap the tiles in.";
    case 'sign-in':
      return 'Sign in to scan a hand, or tap the tiles in.';
    case 'offline':
      return 'No connection, so the photo could not be read. Tap the tiles in instead.';
    case 'unreadable':
    case 'error':
    default:
      return 'Couldn’t read the tiles. Try a straight-down photo in good light, or tap them in.';
  }
}

/** Asked once per device, and remembered either way. */
function PhotoConsent({
  onChoose,
}: {
  onChoose: (choice: 'share' | 'no') => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl px-3 py-2"
      style={{ background: 'var(--tile-face)', border: '1px solid var(--line-strong)' }}
    >
      <p className="text-xs">
        Help improve scanning? We&rsquo;ll keep this photo of your tiles to test
        accuracy. Photos are deleted after 90 days.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChoose('share')}
          className="touch rounded-lg px-3 text-xs font-semibold"
          style={{ background: 'var(--tile-back)', color: '#fff' }}
        >
          Share photo
        </button>
        <button
          type="button"
          onClick={() => onChoose('no')}
          className="touch rounded-lg px-3 text-xs font-semibold"
          style={{ border: '1px solid var(--line-strong)' }}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      className="scan-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  );
}
