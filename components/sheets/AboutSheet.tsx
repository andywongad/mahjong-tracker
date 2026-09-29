'use client';

import { Sheet } from './Sheet';
import { termForHandType } from '@/lib/terms';
import { glossOf } from '@/lib/terms';

/**
 * What the app is and how to drive it, in one read.
 *
 * It lives in a sheet rather than on a screen of its own because it is read
 * once and then never again. A homepage would tax every later visit to explain
 * something that only the first visit needs.
 */
export function AboutSheet({
  open,
  onClose,
  onOpenGlossary,
}: {
  open: boolean;
  onClose: () => void;
  onOpenGlossary?: () => void;
}) {
  return (
    <Sheet
      open={open}
      title="How this works"
      onClose={onClose}
      footer={
        onOpenGlossary ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenGlossary();
            }}
            className="touch w-full rounded-xl px-4 text-sm font-semibold"
            style={{
              border: '1px solid var(--line-strong)',
              color: 'var(--ink)',
            }}
          >
            Look up a term in the glossary
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-sm">
          A scoresheet for Hong Kong mahjong. You record how each hand ended; it
          keeps the running totals, the dealer, the round and who owes what.
        </p>

        <Section title="Recording a hand">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
            <li>Tap whoever won.</li>
            <li>
              Say how they won: <Term type="ceot_cung" /> off someone&rsquo;s
              discard, or <Term type="zi_mo" /> on a tile they drew themselves.
            </li>
            <li>Off a discard, tap the shooter — the player who threw it.</li>
            <li>Tap the faan. Save.</li>
          </ol>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Nobody won? Use <strong>{glossOf('lau_guk')}</strong> under the
            table. Someone declared a win they did not have? Use{' '}
            <strong>{glossOf('zaa_wu')}</strong>. Neither has a winner, which is
            why neither is in the winner sheet.
          </p>
        </Section>

        <Section title="You never type a score">
          <p className="text-sm">
            A hand is worth faan. The app turns faan into points using your
            table&rsquo;s rules and works out all four numbers, so nobody has to
            do the arithmetic while three people wait.
          </p>
          <p className="text-sm">
            Off a discard the shooter usually pays more than the other two; on a
            self pick all three pay the same. Every hand adds up to zero,
            because the winner is paid exactly what the losers hand over.
          </p>
        </Section>

        <Section title="The dealer and the round look after themselves">
          <p className="text-sm">
            None of it is stored. The dealer, the prevailing wind and every
            running total are worked out from the list of hands each time you
            look, so fixing hand 3 fixes everything after it too.
          </p>
        </Section>

        <Section title="Fixing a mistake">
          <p className="text-sm">
            For six seconds after saving, <strong>Undo</strong> takes the hand
            straight back. After that, tap any hand in the log to change it or
            delete it.
          </p>
        </Section>

        <Section title="House rules">
          <p className="text-sm">
            Every game keeps its own copy of the rules from the moment it
            starts. Editing a saved rule set later never rewrites a game you
            have already played. Change them in a game&rsquo;s settings before
            it begins.
          </p>
        </Section>

        <Section title="Where your games live">
          <p className="text-sm">
            In this browser, on this device, and nowhere else. They survive
            closing the tab, restarting the phone and having no signal.
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            They do not follow you to another device, and clearing this
            site&rsquo;s data deletes them. Accounts and syncing are still being
            built, so signing in does not back anything up yet.
          </p>
        </Section>
      </div>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

/** A term the way the rest of the app writes it: characters, name, plain English. */
function Term({ type }: { type: 'ceot_cung' | 'zi_mo' }) {
  const label = termForHandType(type);
  return (
    <span className="font-semibold">
      <span lang="zh-Hant" className="hanzi" aria-hidden="true">
        {label.zh}
      </span>{' '}
      {label.roman}
    </span>
  );
}
