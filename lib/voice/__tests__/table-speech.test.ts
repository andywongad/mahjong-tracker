import { describe, expect, it } from 'vitest';
import type { PlayerNames } from '@/lib/scoring';
import { HK_STANDARD } from '@/lib/rules/types';
import { parseTableAlternatives, parseTableSpeech } from '../grammar';

/**
 * A whole hand out of one sentence, said with nothing tapped first.
 *
 * The sheet's parser only had to find a number. This one decides who the hand
 * is about and who paid for it, which is where a mishearing stops being an
 * annoyance and starts moving money between two real people. So most of what
 * is pinned here is the refusing.
 */

const TABLE = ['Cal', 'Di', 'Ann', 'Bo'] as unknown as PlayerNames;
const read = (said: string) => parseTableSpeech(said, TABLE, HK_STANDARD);
const heardFrom = (said: string) => {
  const parsed = read(said);
  if (!parsed.ok) throw new Error(`refused: ${parsed.reason}`);
  return parsed.heard;
};
const refusal = (said: string) => {
  const parsed = read(said);
  if (parsed.ok) throw new Error(`parsed: ${JSON.stringify(parsed.heard)}`);
  return parsed.reason;
};

describe('a whole hand in one sentence', () => {
  it('reads the sentence this was built for', () => {
    expect(heardFrom('Cal won 6 points from Di')).toEqual({
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 6,
    });
  });

  it('reads the ways a table would actually say it', () => {
    for (const said of [
      'Cal won six off Di',
      'Cal six from Di',
      'Cal wins 6 faan off Di',
      'Cal got 6 off Di',
    ]) {
      expect(heardFrom(said)).toMatchObject({
        type: 'ceot_cung',
        winnerSeat: 0,
        discarderSeat: 1,
        faan: 6,
      });
    }
  });

  it('reads a self draw, which has no shooter', () => {
    expect(heardFrom('Di self drew 4')).toEqual({
      type: 'zi_mo',
      winnerSeat: 1,
      discarderSeat: undefined,
      faan: 4,
    });
  });

  it('reads a false win from the name alone', () => {
    expect(heardFrom('Bo false win')).toEqual({
      type: 'zaa_wu',
      offenderSeat: 3,
    });
  });

  it('reads a draw, which belongs to nobody', () => {
    expect(heardFrom('draw')).toEqual({ type: 'draw' });
    expect(heardFrom('wash out')).toEqual({ type: 'draw' });
  });

  it('takes the limit as the most the table pays', () => {
    expect(heardFrom('Ann won limit off Bo').faan).toBe(13);
  });
});

describe('transcripts a real microphone actually produced', () => {
  /*
   * Said into a phone at a table, by somebody saying the sentence this was
   * built for. Kept verbatim: guessing at how a recogniser fails is how the
   * early phrase lists got written, and this is the correction.
   */
  it('reads "Cal won 6 points from Di" as the phone heard it', () => {
    expect(heardFrom('Cal 1 610 six points from Di')).toEqual({
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 6,
    });
  });

  it('still refuses when nobody scorable was named', () => {
    expect(refusal('flights from Di')).toMatch(/not who won/);
  });

  it('keeps refusing two numbers this table could both score', () => {
    expect(refusal('Cal won 5 or 6 off Di')).toMatch(/just the one number/);
  });
});

describe('what it hands over half-finished', () => {
  it('leaves the route open when the sentence did not say', () => {
    // Enough to open the sheet on, not enough to record.
    expect(heardFrom('Cal 6')).toEqual({
      type: undefined,
      winnerSeat: 0,
      discarderSeat: undefined,
      faan: 6,
    });
  });

  it('leaves the faan open when only the players were said', () => {
    expect(heardFrom('Cal won off Di')).toEqual({
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: undefined,
    });
  });
});

describe('refusing rather than guessing', () => {
  it('will not record a hand for somebody who is not playing', () => {
    expect(refusal('Ed won 6')).toMatch(/nobody at this table/);
  });

  it('will not slide the shooter into the winner*s place', () => {
    // The name it could not place was the winner*s. Dropping it and
    // promoting the only name left would pay the hand to whoever fed it.
    expect(refusal('Ed won 6 from Di')).toBe(
      'I heard who fed it, but not who won.',
    );
  });

  it('will not let one player feed themselves', () => {
    expect(refusal('Cal won 6 from Cal')).toMatch(/Cal twice/);
  });

  it('will not put a shooter on a self draw', () => {
    expect(refusal('Cal self drew 6 from Di')).toMatch(/no shooter/);
  });

  it('will not take three names for one hand', () => {
    expect(refusal('Cal won 6 from Di and Ann')).toMatch(/too many names/);
  });

  it('will not call it a draw when somebody was named', () => {
    // "Cal drew 6" is a win, not a washout.
    expect(heardFrom('Cal drew 6').type).not.toBe('draw');
  });

  it('needs a name for a false win', () => {
    expect(refusal('false win')).toMatch(/needs a name/);
  });

  it('says when the faan is outside this table*s range', () => {
    expect(refusal('Cal won 2 off Di')).toMatch(/under this table/);
    expect(refusal('Cal won 20 off Di')).toMatch(/over this table/);
  });
});

describe('reading down the guesses', () => {
  it('prefers the guess that answers the most of the hand', () => {
    const parsed = parseTableAlternatives(
      ['cal 6', 'cal won 6 points from di'],
      TABLE,
      HK_STANDARD,
    );
    expect(parsed.ok && parsed.heard).toMatchObject({
      type: 'ceot_cung',
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 6,
    });
  });

  it('takes a lower guess over a top one that names nobody', () => {
    const parsed = parseTableAlternatives(
      ['cassidy on six from dyno', 'cal won six from di'],
      TABLE,
      HK_STANDARD,
    );
    expect(parsed.ok && parsed.heard).toMatchObject({
      winnerSeat: 0,
      discarderSeat: 1,
      faan: 6,
    });
  });
});
