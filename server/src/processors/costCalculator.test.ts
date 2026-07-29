import { describe, it, expect } from "vitest";
import {
  resolvePricing,
  computeMessageCost,
  computeCacheSavings,
  isModelPriced,
} from "./costCalculator.js";
import { MODEL_PRICING, DEFAULT_PRICING } from "../config.js";
import type { RawAssistantUsage } from "../types/index.js";

const usage = (over: Partial<RawAssistantUsage> = {}): RawAssistantUsage => ({
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  ...over,
});

describe("resolvePricing", () => {
  it("uses the exact rate for a known model", () => {
    expect(resolvePricing("claude-code", "claude-opus-5")).toEqual(
      MODEL_PRICING["claude-opus-5"],
    );
  });

  it("falls back to the mid-tier rate for an unrecognised Claude model", () => {
    expect(resolvePricing("claude-code", "claude-not-released-yet")).toEqual(
      DEFAULT_PRICING,
    );
  });

  it("returns null for a Codex model rather than pricing it at Anthropic rates", () => {
    expect(resolvePricing("codex", "gpt-5.6-sol")).toBeNull();
  });

  it("still uses an exact rate for a Codex model once one is configured", () => {
    // Guards the path that switches on when rates are added to MODEL_PRICING:
    // the provider check must not shadow a real entry.
    const configured = Object.keys(MODEL_PRICING)[0];
    expect(resolvePricing("codex", configured)).toEqual(
      MODEL_PRICING[configured],
    );
  });
});

describe("computeMessageCost", () => {
  it("prices each token class at its own rate", () => {
    // Opus 5: $5/$25 per Mtok, cache write 6.25, cache read 0.5.
    const cost = computeMessageCost(
      usage({
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
        cache_read_input_tokens: 1_000_000,
      }),
      "claude-code",
      "claude-opus-5",
    );
    expect(cost).toBeCloseTo(5 + 25 + 6.25 + 0.5, 10);
  });

  it("charges nothing for an unpriced Codex model", () => {
    const cost = computeMessageCost(
      usage({ input_tokens: 10_000_000, output_tokens: 10_000_000 }),
      "codex",
      "gpt-5.6-sol",
    );
    expect(cost).toBe(0);
  });

  /**
   * The regression that motivated this suite: every model released after the
   * pricing table was written fell through to DEFAULT_PRICING, understating
   * spend by ~2.8x. A missing entry must never cost out at a lower tier's rate
   * without isModelPriced also reporting it.
   */
  it("flags any model it cannot price exactly", () => {
    const unknown = "claude-some-future-model";
    expect(isModelPriced(unknown)).toBe(false);
    expect(
      computeMessageCost(usage({ output_tokens: 1 }), "claude-code", unknown),
    ).toBeGreaterThan(0);
  });

  it("reports every model in the pricing table as priced", () => {
    for (const model of Object.keys(MODEL_PRICING)) {
      expect(isModelPriced(model), model).toBe(true);
    }
  });

  it("prices Opus above Sonnet, so a fallback is always an understatement", () => {
    const tokens = usage({ output_tokens: 1_000_000 });
    const opus = computeMessageCost(tokens, "claude-code", "claude-opus-5");
    const fallback = (DEFAULT_PRICING.output * 1_000_000) / 1_000_000;
    expect(opus).toBeGreaterThan(fallback);
  });
});

describe("computeCacheSavings", () => {
  it("values a cache read as the input rate it avoided", () => {
    const p = MODEL_PRICING["claude-opus-5"];
    expect(
      computeCacheSavings(1_000_000, "claude-code", "claude-opus-5"),
    ).toBeCloseTo(p.input - p.cacheRead, 10);
  });

  it("claims no savings for an unpriced model", () => {
    expect(computeCacheSavings(225_000_000, "codex", "gpt-5.5")).toBe(0);
  });
});
