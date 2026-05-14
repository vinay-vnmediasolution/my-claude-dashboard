import type { SessionsParams } from "./hooks/types";

export const queryKeys = {
  overview: () => ["overview"] as const,
  sessions: (params: SessionsParams = {}) => ["sessions", params] as const,
  session: (sessionId: string | undefined) => ["session", sessionId] as const,
  analytics: (from: string, to: string, granularity: string) =>
    ["analytics", from, to, granularity] as const,
  insights: () => ["insights"] as const,
} as const;
