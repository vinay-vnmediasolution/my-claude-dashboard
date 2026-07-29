import {
  MODEL_PRICING,
  DEFAULT_PRICING,
  type ModelPricing,
} from "../config.js";
import type { RawAssistantUsage, ProviderId } from "../types/index.js";

/**
 * Whether a model has an explicit entry in MODEL_PRICING. Models without one
 * are costed at DEFAULT_PRICING, which silently understates spend for any tier
 * above Sonnet — callers surface these so a new model release is visible
 * rather than quietly wrong.
 */
export function isModelPriced(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICING, model);
}

/**
 * Rates for a session's tokens, or null when there is no honest way to price
 * them.
 *
 * An unrecognised Anthropic model falls back to the mid-tier rate: it is a
 * guess, but a bounded one, since every Claude tier sits within a few times
 * that price. A model from another vendor has no such neighbour — pricing
 * OpenAI tokens at Anthropic's rate would not approximate the bill, it would
 * fabricate it. Those are left unpriced and reported at zero, and the unpriced
 * model surfaces in the UI so the gap is visible rather than silent.
 */
export function resolvePricing(
  provider: ProviderId,
  model: string,
): ModelPricing | null {
  const exact = MODEL_PRICING[model];
  if (exact) return exact;
  return provider === "claude-code" ? DEFAULT_PRICING : null;
}

export function computeMessageCost(
  usage: RawAssistantUsage,
  provider: ProviderId,
  model: string,
): number {
  const p = resolvePricing(provider, model);
  if (!p) return 0;
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
  provider: ProviderId,
  model: string,
): number {
  const p = resolvePricing(provider, model);
  if (!p) return 0;
  return (cacheReadTokens * (p.input - p.cacheRead)) / 1_000_000;
}
