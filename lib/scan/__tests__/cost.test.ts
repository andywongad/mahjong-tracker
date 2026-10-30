import { describe, expect, it } from 'vitest';
import { estimateCost } from '../cost';

describe('what a scan cost', () => {
  it('prices a typical Haiku scan at a fraction of a cent', () => {
    // A 1568px photo is a couple of thousand visual tokens.
    const cost = estimateCost('claude-haiku-5-5', 2500, 200)!;
    expect(cost).toBeCloseTo(0.00035, 5);
  });

  it('uses the long-prompt rate only above the threshold', () => {
    const under = estimateCost('claude-haiku-5-5', 100_000, 0)!;
    const over = estimateCost('claude-haiku-5-5', 100_001, 0)!;
    expect(under).toBeCloseTo(0.01, 6);
    expect(over).toBeCloseTo(0.05, 4);
  });

  it('prices the fallback model higher, as it is', () => {
    const haiku = estimateCost('claude-haiku-5-5', 2500, 200)!;
    const sonnet = estimateCost('claude-sonnet-5-5', 2500, 200)!;
    expect(sonnet).toBeGreaterThan(haiku * 10);
  });

  it('says it does not know rather than saying nothing was spent', () => {
    expect(estimateCost('some-future-model', 1000, 100)).toBeNull();
  });
});
