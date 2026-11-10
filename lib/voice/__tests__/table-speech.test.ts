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

/*
 * Transcripts a real microphone actually produced, at a real table, from
 * somebody saying the sentence this was built for. Kept verbatim and kept
 * together: guessing at how a recogniser fails is how the first phrase lists
 * got written, and this block is the correction.
 *
 * Every one of them says "won", and that one word is the whole story. The
 * recogniser hears it as a one, runs it into the number after it, and four
 * times out of six drags the winner's name down with it. What can be
 * rescued is rescued; the rest is refused, and the control now teaches the
 * phrasing that avoids it.
 */
describe('transcripts a real microphone actually produced', () => {
  const REAL = ['Ann', 'Bo', 'Cal', 'Di'] as unknown as PlayerNames;
  const ANN = 0;
  const BO = 1;
  const CAL = 2;
  const DI = 3;
  const realHeard = (said: string) => {
    const parsed = parseTableSpeech(said, REAL, HK_STANDARD);
    if (!parsed.ok) throw new Error(`refused: ${parsed.reason}`);
    return parsed.heard;
  };
  const realRefusal = (said: string) => {
    const parsed = parseTableSpeech(said, REAL, HK_STANDARD);
    if (parsed.ok) throw new Error(`parsed: ${JSON.stringify(parsed.heard)}`);
    return parsed.reason;
  };

  it('reads one where only the number was damaged', () => {
    // "Cal won 6 points from Di"
    expect(realHeard('Cal 1 610 six points from Di')).toEqual({
      type: 'ceot_cung',
      winnerSeat: CAL,
      discarderSeat: DI,
      faan: 6,
    });
  });

  it('unpicks a verb that collapsed into the number', () => {
    // "Di won 6 points from Cal". 16 is over the cap, so six is the
    // only thing it can have been.
    expect(realHeard('Di 16 points from Cal')).toEqual({
      type: 'ceot_cung',
      winnerSeat: DI,
      discarderSeat: CAL,
      faan: 6,
    });
  });

  it('leaves a scorable number alone, however it was said', () => {
    // 13 is the limit at this table, not a collapsed "won 3".
    expect(realHeard('Di 13 from Cal').faan).toBe(13);
  });

  it('reads the phrasing the control now asks for', () => {
    // The same hand, said without the verb that breaks it.
    expect(realHeard('Di 6 from Cal')).toEqual({
      type: 'ceot_cung',
      winnerSeat: DI,
      discarderSeat: CAL,
      faan: 6,
    });
    expect(realHeard('Ann 5 from Bo')).toMatchObject({
      winnerSeat: ANN,
      discarderSeat: BO,
      faan: 5,
    });
  });

  it('refuses the attempts where the winner went down with the verb', () => {
    for (const said of [
      '3 points from Cal',
      '1 3 points from Bo',
      '6 points from Cal',
      '1/6 points from Cal',
    ]) {
      expect(realRefusal(said)).toMatch(/not who won/);
    }
  });

  it('has nothing to offer when the whole phrase collapsed', () => {
    expect(realRefusal('01300')).toMatch(/nobody at this table/);
  });

  it('still refuses when nobody scorable was named', () => {
    expect(realRefusal('flights from Di')).toMatch(/not who won/);
  });

  it('keeps refusing two numbers this table could both score', () => {
    expect(realRefusal('Cal 5 or 6 off Di')).toMatch(
      /just the one number/,
    );
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
    expect(refusal('Ed won 6 from Di')).toMatch(
      /but not who won/,
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
