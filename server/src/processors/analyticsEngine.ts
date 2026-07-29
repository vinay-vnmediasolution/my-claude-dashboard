import { format, subDays, parseISO, differenceInDays, getDay } from "date-fns";
import { computeCacheSavings, resolvePricing } from "./costCalculator.js";
import type {
  SessionData,
  OverviewStats,
  HeatmapEntry,
  HourlyEntry,
  ProjectSummary,
  ModelSummary,
  AnalyticsData,
  InsightsData,
  TokenTimelineEntry,
  ToolBreakdownEntry,
  CacheMetrics,
  BillingBreakdownEntry,
  AccessMode,
  AccessModeEntry,
  DataCoverage,
  ProviderMeta,
} from "../types/index.js";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function buildToolBreakdown(
  sessions: SessionData[],
): ToolBreakdownEntry[] {
  const counts = new Map<string, number>();
  const errors = new Map<string, number>();

  for (const s of sessions) {
    for (const [tool, count] of Object.entries(s.toolUsage)) {
      counts.set(tool, (counts.get(tool) ?? 0) + count);
    }
    for (const [tool, count] of Object.entries(s.toolErrors)) {
      errors.set(tool, (errors.get(tool) ?? 0) + count);
    }
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  return [...counts.entries()]
    .map(([tool, count]) => {
      const errorCount = errors.get(tool) ?? 0;
      return {
        tool,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        errors: errorCount,
        errorRate: count > 0 ? errorCount / count : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function buildHeatmap(sessions: SessionData[]): HeatmapEntry[] {
  const counts = new Map<string, number>();
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    counts.set(format(subDays(today, i), "yyyy-MM-dd"), 0);
  }

  for (const s of sessions) {
    const date = s.startTime.slice(0, 10);
    if (counts.has(date)) {
      counts.set(date, (counts.get(date) ?? 0) + s.userMessageCount);
    }
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export function buildHourlyData(sessions: SessionData[]): HourlyEntry[] {
  const hours: HourlyEntry[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    messages: 0,
    cost: 0,
  }));

  for (const s of sessions) {
    const hour = new Date(s.startTime).getHours();
    hours[hour].messages += s.userMessageCount;
    hours[hour].cost += s.estimatedCost;
  }

  return hours;
}

export function buildTopProjects(sessions: SessionData[]): ProjectSummary[] {
  const map = new Map<string, ProjectSummary>();

  for (const s of sessions) {
    const existing = map.get(s.projectPath);
    if (existing) {
      existing.sessions++;
      existing.cost += s.estimatedCost;
      existing.messages += s.userMessageCount;
      existing.outputTokens += s.totalOutputTokens;
    } else {
      map.set(s.projectPath, {
        name: s.projectName,
        path: s.projectPath,
        sessions: 1,
        cost: s.estimatedCost,
        messages: s.userMessageCount,
        outputTokens: s.totalOutputTokens,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.cost - a.cost).slice(0, 10);
}

export function buildModelBreakdown(sessions: SessionData[]): ModelSummary[] {
  const map = new Map<string, ModelSummary>();

  for (const s of sessions) {
    const model = s.models[0] ?? "unknown";
    const existing = map.get(model);
    if (existing) {
      existing.sessions++;
      existing.cost += s.estimatedCost;
      existing.outputTokens += s.totalOutputTokens;
      existing.inputTokens += s.totalInputTokens;
    } else {
      map.set(model, {
        model,
        sessions: 1,
        cost: s.estimatedCost,
        outputTokens: s.totalOutputTokens,
        inputTokens: s.totalInputTokens,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

function buildBillingBreakdown(
  sessions: SessionData[],
): BillingBreakdownEntry[] {
  const map = new Map<string, BillingBreakdownEntry>();

  for (const s of sessions) {
    const source = s.billingSource;
    const existing = map.get(source);
    if (existing) {
      existing.sessions++;
      existing.cost += s.estimatedCost;
      existing.messages += s.userMessageCount;
    } else {
      map.set(source, {
        source,
        sessions: 1,
        cost: s.estimatedCost,
        messages: s.userMessageCount,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}

const ACCESS_MODE_META: Record<
  AccessMode,
  { label: string; description: string }
> = {
  "claude-code": {
    label: "Claude Code",
    description: "Terminal CLI — agentic coding, file edits, shell commands",
  },
  "claude-code-sdk": {
    label: "Claude Code (SDK)",
    description: "Claude Code via SDK integration or programmatic invocation",
  },
  codex: {
    label: "Codex",
    description: "OpenAI Codex — desktop app and CLI",
  },
  api: {
    label: "Direct API",
    description: "Per-token API key billing — custom apps and integrations",
  },
  "claude-ai-pro": {
    label: "Claude.ai Pro",
    description: "claude.ai web/desktop — co-work, chat, projects, artifacts",
  },
  "claude-ai-max": {
    label: "Claude.ai Max",
    description: "Claude Max subscription — higher limits on claude.ai",
  },
  "claude-ai-free": {
    label: "Claude.ai Free",
    description: "Free-tier access via claude.ai",
  },
  unknown: {
    label: "Unknown",
    description: "Access method could not be determined",
  },
};

function deriveAccessMode(session: SessionData): AccessMode {
  // The remaining rules read Claude Code's entrypoint and billing fields, which
  // another provider never sets — without this the whole of Codex would fall
  // through to "unknown" despite its access mode being the one thing we do know.
  if (session.provider === "codex") return "codex";

  const eps = session.entrypoints;
  if (eps.includes("sdk-cli")) return "claude-code-sdk";
  if (eps.includes("cli")) return "claude-code";
  if (session.billingSource === "api") return "api";
  if (session.billingSource === "max") return "claude-ai-max";
  if (session.billingSource === "pro") return "claude-ai-pro";
  if (session.billingSource === "free") return "claude-ai-free";
  return "unknown";
}

function buildAccessModeBreakdown(sessions: SessionData[]): AccessModeEntry[] {
  const map = new Map<AccessMode, AccessModeEntry>();

  for (const s of sessions) {
    const mode = deriveAccessMode(s);
    const existing = map.get(mode);
    if (existing) {
      existing.sessions++;
      existing.cost += s.estimatedCost;
      existing.messages += s.userMessageCount;
    } else {
      const meta = ACCESS_MODE_META[mode];
      map.set(mode, {
        mode,
        label: meta.label,
        description: meta.description,
        sessions: 1,
        cost: s.estimatedCost,
        messages: s.userMessageCount,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}

export function buildOverviewStats(
  sessions: SessionData[],
  coverage: DataCoverage,
  providers: ProviderMeta[],
): OverviewStats {
  const activeDates = new Set(sessions.map((s) => s.startTime.slice(0, 10)));
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0);
  const totalInput = sessions.reduce((sum, s) => sum + s.totalInputTokens, 0);
  const totalOutput = sessions.reduce((sum, s) => sum + s.totalOutputTokens, 0);
  const totalCacheRead = sessions.reduce(
    (sum, s) => sum + s.totalCacheReadTokens,
    0,
  );
  const totalCacheCreate = sessions.reduce(
    (sum, s) => sum + s.totalCacheCreateTokens,
    0,
  );
  const totalEffectiveInput = totalInput + totalCacheRead + totalCacheCreate;
  const cacheHitRate =
    totalEffectiveInput > 0 ? totalCacheRead / totalEffectiveInput : 0;

  const sortedSessions = [...sessions].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const unpricedModels = new Set<string>();
  for (const s of sessions) {
    s.unpricedModels.forEach((m) => unpricedModels.add(m));
  }

  return {
    totalSessions: sessions.length,
    totalUserMessages: sessions.reduce((sum, s) => sum + s.userMessageCount, 0),
    totalToolResults: sessions.reduce((sum, s) => sum + s.toolResultCount, 0),
    totalAssistantMessages: sessions.reduce(
      (sum, s) => sum + s.assistantMessageCount,
      0,
    ),
    unpricedModels: [...unpricedModels].sort(),
    totalCost,
    activeDays: activeDates.size,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCacheReadTokens: totalCacheRead,
    totalCacheCreateTokens: totalCacheCreate,
    cacheHitRate,
    heatmapData: buildHeatmap(sessions),
    hourlyData: buildHourlyData(sessions),
    topProjects: buildTopProjects(sessions),
    modelBreakdown: buildModelBreakdown(sessions),
    firstSessionDate: sortedSessions[0]?.startTime ?? "",
    lastSessionDate: sortedSessions[sortedSessions.length - 1]?.startTime ?? "",
    billingBreakdown: buildBillingBreakdown(sessions),
    accessModeBreakdown: buildAccessModeBreakdown(sessions),
    coverage,
    providers,
  };
}

export function buildAnalyticsData(
  sessions: SessionData[],
  from?: string,
  to?: string,
  granularity: "day" | "week" = "day",
): AnalyticsData {
  const filtered = sessions.filter((s) => {
    const date = s.startTime.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });

  // Token timeline
  const timelineMap = new Map<string, TokenTimelineEntry>();
  for (const s of filtered) {
    let key = s.startTime.slice(0, 10);
    if (granularity === "week") {
      const d = parseISO(key);
      const dayOfWeek = getDay(d);
      key = format(subDays(d, dayOfWeek), "yyyy-MM-dd");
    }
    const existing = timelineMap.get(key);
    if (existing) {
      existing.input += s.totalInputTokens;
      existing.output += s.totalOutputTokens;
      existing.cacheCreate += s.totalCacheCreateTokens;
      existing.cacheRead += s.totalCacheReadTokens;
      existing.cost += s.estimatedCost;
    } else {
      timelineMap.set(key, {
        date: key,
        input: s.totalInputTokens,
        output: s.totalOutputTokens,
        cacheCreate: s.totalCacheCreateTokens,
        cacheRead: s.totalCacheReadTokens,
        cost: s.estimatedCost,
      });
    }
  }

  const toolBreakdown = buildToolBreakdown(filtered);

  // Cache metrics
  const totalCacheRead = filtered.reduce(
    (sum, s) => sum + s.totalCacheReadTokens,
    0,
  );
  const totalCacheCreate = filtered.reduce(
    (sum, s) => sum + s.totalCacheCreateTokens,
    0,
  );
  const totalInput = filtered.reduce((sum, s) => sum + s.totalInputTokens, 0);
  const totalEffective = totalInput + totalCacheRead + totalCacheCreate;
  // Compute savings per session using its own model's pricing, then sum
  const savingsUSD = filtered.reduce(
    (sum, s) =>
      sum +
      computeCacheSavings(
        s.totalCacheReadTokens,
        s.provider,
        s.models[0] ?? "",
      ),
    0,
  );
  const cacheMetrics: CacheMetrics = {
    totalCacheRead,
    totalCacheCreate,
    hitRate: totalEffective > 0 ? totalCacheRead / totalEffective : 0,
    savingsUSD,
  };

  // Cost by project
  const projectCostMap = new Map<
    string,
    { cost: number; inputCost: number; outputCost: number; cacheCost: number }
  >();
  for (const s of filtered) {
    const existing = projectCostMap.get(s.projectName);
    // Null for an unpriced model, which zeroes the split to match the session's
    // own estimatedCost of 0 — otherwise the parts would not sum to the whole.
    const pricing = resolvePricing(s.provider, s.models[0] ?? "");
    const inputCost = (s.totalInputTokens * (pricing?.input ?? 0)) / 1_000_000;
    const outputCost =
      (s.totalOutputTokens * (pricing?.output ?? 0)) / 1_000_000;
    const cacheCost = s.estimatedCost - inputCost - outputCost;
    if (existing) {
      existing.cost += s.estimatedCost;
      existing.inputCost += inputCost;
      existing.outputCost += outputCost;
      existing.cacheCost += Math.max(0, cacheCost);
    } else {
      projectCostMap.set(s.projectName, {
        cost: s.estimatedCost,
        inputCost,
        outputCost,
        cacheCost: Math.max(0, cacheCost),
      });
    }
  }

  return {
    tokenTimeline: [...timelineMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    toolBreakdown,
    cacheMetrics,
    costByProject: [...projectCostMap.entries()]
      .map(([project, costs]) => ({ project, ...costs }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10),
    costByModel: buildModelBreakdown(filtered),
  };
}

export function computeStreaks(sessions: SessionData[]): {
  current: number;
  longest: number;
} {
  const activeDates = new Set(sessions.map((s) => s.startTime.slice(0, 10)));
  const sorted = [...activeDates].sort();

  if (sorted.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
    if (diff === 1) {
      current++;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }
  longest = Math.max(longest, current);

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const isActive = activeDates.has(today) || activeDates.has(yesterday);
  if (!isActive) current = 0;

  return { current, longest };
}

export function buildInsightsData(sessions: SessionData[]): InsightsData {
  const { current, longest } = computeStreaks(sessions);

  const hourlyData = buildHourlyData(sessions);
  const peakHours = [...hourlyData]
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 3)
    .map((h) => ({
      hour: h.hour,
      score: h.messages,
      label: hourLabel(h.hour),
    }));

  const mostUsedTools = buildToolBreakdown(sessions).slice(0, 8);

  // Priced per session against its own model rather than against whichever
  // model happened to come first: sessions span several models and two
  // providers, and one rate applied to all of them is not an estimate of
  // anything.
  const cacheSavingsUSD = sessions.reduce(
    (sum, s) =>
      sum +
      computeCacheSavings(
        s.totalCacheReadTokens,
        s.provider,
        s.models[0] ?? "",
      ),
    0,
  );

  const projectMap = new Map<
    string,
    { sessions: number; totalHours: number; totalCost: number }
  >();
  for (const s of sessions) {
    const existing = projectMap.get(s.projectName);
    const hours = s.activeMinutes / 60;
    if (existing) {
      existing.sessions++;
      existing.totalHours += hours;
      existing.totalCost += s.estimatedCost;
    } else {
      projectMap.set(s.projectName, {
        sessions: 1,
        totalHours: hours,
        totalCost: s.estimatedCost,
      });
    }
  }
  const favoriteProjects = [...projectMap.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  const avgDuration =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.activeMinutes, 0) / sessions.length
      : 0;
  const avgMessages =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.userMessageCount, 0) /
        sessions.length
      : 0;

  // Most productive day of week
  const dayCounts = new Array(7).fill(0);
  for (const s of sessions) {
    const day = getDay(parseISO(s.startTime.slice(0, 10)));
    dayCounts[day] += s.userMessageCount;
  }
  const mostProductiveDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const mostProductiveDay = DAYS_OF_WEEK[mostProductiveDayIdx] ?? "Monday";

  // Skills
  const skillMap = new Map<string, number>();
  for (const s of sessions) {
    for (const skill of s.skills) {
      skillMap.set(skill, (skillMap.get(skill) ?? 0) + 1);
    }
  }
  const skillsUsed = [...skillMap.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);

  const longestSession =
    [...sessions].sort((a, b) => b.activeMinutes - a.activeMinutes)[0] ??
    sessions[0] ??
    ({ sessionId: "", durationMinutes: 0, projectName: "" } as SessionData);
  const mostExpensiveSession =
    [...sessions].sort((a, b) => b.estimatedCost - a.estimatedCost)[0] ??
    sessions[0] ??
    ({ sessionId: "", estimatedCost: 0, projectName: "" } as SessionData);

  return {
    peakHours,
    currentStreak: current,
    longestStreak: longest,
    mostUsedTools,
    cacheSavingsUSD,
    favoriteProjects,
    averageSessionDuration: Math.round(avgDuration),
    averageMessagesPerSession: Math.round(avgMessages),
    totalUserMessages: sessions.reduce((sum, s) => sum + s.userMessageCount, 0),
    mostProductiveDay,
    skillsUsed,
    totalActiveDays: new Set(sessions.map((s) => s.startTime.slice(0, 10)))
      .size,
    longestSession: {
      sessionId: longestSession.sessionId,
      durationMinutes: longestSession.activeMinutes,
      projectName: longestSession.projectName,
    },
    mostExpensiveSession: {
      sessionId: mostExpensiveSession.sessionId,
      cost: mostExpensiveSession.estimatedCost,
      projectName: mostExpensiveSession.projectName,
    },
  };
}
