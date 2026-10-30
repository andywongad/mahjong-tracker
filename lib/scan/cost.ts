/**
 * What a scan cost, worked out from the tokens the API reports.
 *
 * Prices are per million tokens, from the published rates. Claude Haiku 5.5 is
 * priced by prompt length and charges more above 100,000 input tokens; a photo
 * and this prompt come to a few thousand, so the lower rate is the one that
 * applies and the threshold is checked rather than assumed.
 *
 * A model that is not in the table costs an unknown amount rather than zero:
 * returning null keeps "we do not know" out of the totals, where a 0 would
 * quietly understate them.
 */
export interface Price {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
  /** Above this many input tokens the long-prompt rate applies. */
  longPromptFrom?: number;
  longPrompt?: { input: number; output: number };
}

export const PRICES: Record<string, Price> = {
  'claude-haiku-5-5': {
    input: 0.1,
    output: 0.5,
    longPromptFrom: 100_000,
    longPrompt: { input: 0.5, output: 2.5 },
  },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const price = PRICES[model];
  if (!price) return null;

  const rate =
    price.longPrompt &&
    price.longPromptFrom !== undefined &&
    inputTokens > price.longPromptFrom
      ? price.longPrompt
      : price;

  return (
    (inputTokens / 1_000_000) * rate.input +
    (outputTokens / 1_000_000) * rate.output
  );
}
