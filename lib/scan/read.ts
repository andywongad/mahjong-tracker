/**
 * Ask the model what tiles are in the photo.
 *
 * The call sits behind Reader so the route can be tested without a network:
 * every test injects a reader that returns a canned answer. Nothing in here
 * decides what a hand is worth — it reports tiles, and the solver and the
 * rules engine do the rest. A faan from a model would be a guess wearing the
 * clothes of a calculation.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readingSchema } from './codes';
import { SCAN_SYSTEM_PROMPT, SCAN_USER_PROMPT } from './prompt';
import { validateReading, isSolvable, type ValidReading } from './validate';
import type { ScanConfig } from './config';

/** Room for the reply and for the thinking that counts against the same limit. */
const MAX_TOKENS = 2048;
const FALLBACK_MAX_TOKENS = 4096;

export interface ReaderInput {
  model: string;
  /** Base64 JPEG, already downscaled by the browser. */
  image: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  effort: ScanConfig['effort'];
  maxTokens: number;
}

export interface ReaderOutput {
  raw: unknown;
  inputTokens: number;
  outputTokens: number;
}

export type Reader = (input: ReaderInput) => Promise<ReaderOutput>;

export function anthropicReader(apiKey: string): Reader {
  const client = new Anthropic({ apiKey });

  return async ({ model, image, mediaType, effort, maxTokens }) => {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: SCAN_SYSTEM_PROMPT,
      // Structured outputs are generally available and need no beta header, so
      // the shape and the tile vocabulary are guaranteed rather than hoped for.
      output_config: {
        effort,
        format: { type: 'json_schema', schema: readingSchema() },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            { type: 'text', text: SCAN_USER_PROMPT },
          ],
        },
      ],
    });

    // Thinking blocks can come first, so take the first text block rather than
    // assuming content[0].
    const text = message.content.find((block) => block.type === 'text');
    let raw: unknown = null;
    if (text && text.type === 'text') {
      try {
        raw = JSON.parse(text.text);
      } catch {
        raw = null;
      }
    }

    return {
      raw,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  };
}

export interface ScanOutcome {
  outcome: 'ok' | 'invalid';
  reading: ValidReading | null;
  /** Whether the tiles split into four sets and a pair. */
  solvable: boolean;
  modelUsed: string;
  usedFallback: boolean;
  /** Both attempts summed: a fallback is part of the same scan, not a new one. */
  inputTokens: number;
  outputTokens: number;
}

/**
 * Read the hand, falling back to the stronger model once.
 *
 * The fallback fires on a reading that breaks the rules of a tile set, and
 * also on one that is merely unsolvable, because an unsolvable hand is usually
 * a misread tile. But a valid-yet-unsolvable reading is still returned: it can
 * be a correct reading of a photo taken one tile early, and the player is
 * about to check it anyway. The scorer already says "these tiles do not make
 * four sets and a pair", which is the honest thing to tell them.
 */
export async function readHand(
  image: string,
  mediaType: ReaderInput['mediaType'],
  config: ScanConfig,
  reader: Reader,
): Promise<ScanOutcome> {
  let inputTokens = 0;
  let outputTokens = 0;

  const attempt = async (model: string, maxTokens: number) => {
    const result = await reader({
      model,
      image,
      mediaType,
      effort: config.effort,
      maxTokens,
    });
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;
    return validateReading(result.raw);
  };

  const first = await attempt(config.model, MAX_TOKENS);
  if (first.ok && isSolvable(first.reading.tiles)) {
    return {
      outcome: 'ok',
      reading: first.reading,
      solvable: true,
      modelUsed: config.model,
      usedFallback: false,
      inputTokens,
      outputTokens,
    };
  }

  const second = await attempt(config.fallbackModel, FALLBACK_MAX_TOKENS);
  if (second.ok) {
    return {
      outcome: 'ok',
      reading: second.reading,
      solvable: isSolvable(second.reading.tiles),
      modelUsed: config.fallbackModel,
      usedFallback: true,
      inputTokens,
      outputTokens,
    };
  }

  // The fallback failed the rules. If the first model gave something lawful
  // but unsolvable, that beats nothing.
  if (first.ok) {
    return {
      outcome: 'ok',
      reading: first.reading,
      solvable: false,
      modelUsed: config.model,
      usedFallback: true,
      inputTokens,
      outputTokens,
    };
  }

  return {
    outcome: 'invalid',
    reading: null,
    solvable: false,
    modelUsed: config.fallbackModel,
    usedFallback: true,
    inputTokens,
    outputTokens,
  };
}
