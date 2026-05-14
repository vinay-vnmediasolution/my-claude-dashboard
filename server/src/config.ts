import os from "os";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

function resolveDir(dir: string): string {
  if (dir.startsWith("~/")) {
    return path.join(os.homedir(), dir.slice(2));
  }
  return dir;
}

export const CLAUDE_DIR = resolveDir(process.env.CLAUDE_DIR ?? "~/.claude");
export const PORT = parseInt(process.env.PORT ?? "3001", 10);
export const CACHE_TTL_MS =
  parseInt(process.env.CACHE_TTL_SECONDS ?? "60", 10) * 1000;

// Optional ISO date (YYYY-MM-DD) marking when you switched to API billing.
// Sessions on/after this date are labelled "api"; earlier ones use subscription
// detection from the JSONL service_tier field. Leave unset if you only ever
// used a subscription plan.
export const BILLING_API_START_DATE: string | undefined =
  process.env.BILLING_API_START_DATE || undefined;

export interface ModelPricing {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

// Prices in USD per million tokens
export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  "claude-opus-4-5": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  "claude-sonnet-4-6": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "claude-sonnet-4-5": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "claude-haiku-4-5": {
    input: 0.8,
    output: 4,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
  "claude-haiku-4-5-20251001": {
    input: 0.8,
    output: 4,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
};

export const DEFAULT_PRICING: ModelPricing = {
  input: 3,
  output: 15,
  cacheWrite: 3.75,
  cacheRead: 0.3,
};
