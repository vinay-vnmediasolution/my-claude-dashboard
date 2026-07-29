export interface RawAssistantUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  service_tier?: string;
}

export type BillingSource = "api" | "max" | "pro" | "free" | "unknown";

export interface ParsedMessage {
  uuid: string;
  parentUuid: string | null;
  type: "user" | "assistant";
  timestamp: string;
  sessionId: string;
  cwd: string;
  gitBranch?: string;
  entrypoint?: string;
  attributionSkill?: string;
  // user only
  userText?: string;
  /** True when this "user" entry is a tool result rather than a human turn. */
  isToolResult?: boolean;
  // assistant only
  model?: string;
  usage?: RawAssistantUsage;
  cost?: number;
  tools?: Array<{ name: string; input?: Record<string, unknown> }>;
  hasThinking?: boolean;
  textContent?: string;
}

export interface SessionData {
  sessionId: string;
  projectDirKey: string;
  projectPath: string;
  projectName: string;
  aiTitle?: string;
  firstUserMessage?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Human-authored turns only — excludes tool-result entries. */
  userMessageCount: number;
  /** Tool-result entries, which the transcript also records with role "user". */
  toolResultCount: number;
  assistantMessageCount: number;
  models: string[];
  /** Models with no MODEL_PRICING entry, costed at DEFAULT_PRICING. */
  unpricedModels: string[];
  entrypoints: string[];
  skills: string[];
  gitBranches: string[];
  toolUsage: Record<string, number>;
  /** Failed calls per tool, keyed the same as toolUsage. */
  toolErrors: Record<string, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreateTokens: number;
  totalCacheReadTokens: number;
  estimatedCost: number;
  billingSource: BillingSource;
}

export interface BillingBreakdownEntry {
  source: BillingSource;
  sessions: number;
  cost: number;
  messages: number;
}

export type AccessMode =
  | "claude-code"
  | "claude-code-sdk"
  | "api"
  | "claude-ai-pro"
  | "claude-ai-max"
  | "claude-ai-free"
  | "unknown";

export interface AccessModeEntry {
  mode: AccessMode;
  label: string;
  description: string;
  sessions: number;
  cost: number;
  messages: number;
}

export interface HeatmapEntry {
  date: string;
  count: number;
}

export interface HourlyEntry {
  hour: number;
  messages: number;
  cost: number;
}

export interface ProjectSummary {
  name: string;
  path: string;
  sessions: number;
  cost: number;
  messages: number;
  outputTokens: number;
}

export interface ModelSummary {
  model: string;
  sessions: number;
  cost: number;
  outputTokens: number;
  inputTokens: number;
}

export interface OverviewStats {
  totalSessions: number;
  totalUserMessages: number;
  totalToolResults: number;
  totalAssistantMessages: number;
  /** Non-empty when usage was found for a model missing from MODEL_PRICING. */
  unpricedModels: string[];
  totalCost: number;
  activeDays: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreateTokens: number;
  cacheHitRate: number;
  heatmapData: HeatmapEntry[];
  hourlyData: HourlyEntry[];
  topProjects: ProjectSummary[];
  modelBreakdown: ModelSummary[];
  firstSessionDate: string;
  lastSessionDate: string;
  billingBreakdown: BillingBreakdownEntry[];
  accessModeBreakdown: AccessModeEntry[];
}

export interface TokenTimelineEntry {
  date: string;
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
  cost: number;
}

export interface ToolBreakdownEntry {
  tool: string;
  count: number;
  pct: number;
  errors: number;
  /** Failed calls as a fraction of this tool's total calls (0-1). */
  errorRate: number;
}

export interface CacheMetrics {
  totalCacheRead: number;
  totalCacheCreate: number;
  hitRate: number;
  savingsUSD: number;
}

export interface AnalyticsData {
  tokenTimeline: TokenTimelineEntry[];
  toolBreakdown: ToolBreakdownEntry[];
  cacheMetrics: CacheMetrics;
  costByProject: Array<{
    project: string;
    cost: number;
    inputCost: number;
    outputCost: number;
    cacheCost: number;
  }>;
  costByModel: ModelSummary[];
}

export interface PeakHour {
  hour: number;
  score: number;
  label: string;
}

export interface InsightsData {
  peakHours: PeakHour[];
  currentStreak: number;
  longestStreak: number;
  mostUsedTools: ToolBreakdownEntry[];
  cacheSavingsUSD: number;
  favoriteProjects: Array<{
    name: string;
    sessions: number;
    totalHours: number;
    totalCost: number;
  }>;
  averageSessionDuration: number;
  averageMessagesPerSession: number;
  mostProductiveDay: string;
  skillsUsed: Array<{ skill: string; count: number }>;
  totalActiveDays: number;
  longestSession: {
    sessionId: string;
    durationMinutes: number;
    projectName: string;
  };
  mostExpensiveSession: {
    sessionId: string;
    cost: number;
    projectName: string;
  };
}
