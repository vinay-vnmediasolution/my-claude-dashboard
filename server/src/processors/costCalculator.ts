import { MODEL_PRICING, DEFAULT_PRICING } from "../config.js";
import type { RawAssistantUsage } from "../types/index.js";

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
