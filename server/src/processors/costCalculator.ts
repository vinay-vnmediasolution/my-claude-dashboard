import { MODEL_PRICING, DEFAULT_PRICING } from "../config.js";
import type { RawAssistantUsage } from "../types/index.js";

/**
 * Whether a model has an explicit entry in MODEL_PRICING. Models without one
 * are costed at DEFAULT_PRICING, which silently understates spend for any tier
 * above Sonnet — callers surface these so a new model release is visible
 * rather than quietly wrong.
 */
export function isModelPriced(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICING, model);
}

export function computeMessageCost(
  usage: RawAssistantUsage,
  model: string,
): number {
  const p = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (
    (usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      usage.cache_creation_input_tokens * p.cacheWrite +
      usage.cache_read_input_tokens * p.cacheRead) /
    1_000_000
  );
}

export function computeCacheSavings(
  cacheReadTokens: number,
  model: string,
): number {
  const p = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (cacheReadTokens * (p.input - p.cacheRead)) / 1_000_000;
}
