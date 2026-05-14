import { format, subDays, parseISO, differenceInDays, getDay } from "date-fns";
import { computeCacheSavings } from "./costCalculator.js";
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

export function buildOverviewStats(sessions: SessionData[]): OverviewStats {
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

  return {
    totalSessions: sessions.length,
    totalUserMessages: sessions.reduce((sum, s) => sum + s.userMessageCount, 0),
    totalAssistantMessages: sessions.reduce(
      (sum, s) => sum + s.assistantMessageCount,
      0,
    ),
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

  // Tool breakdown
  const toolMap = new Map<string, number>();
  for (const s of filtered) {
    for (const [tool, count] of Object.entries(s.toolUsage)) {
      toolMap.set(tool, (toolMap.get(tool) ?? 0) + count);
    }
  }
  const totalTools = [...toolMap.values()].reduce((a, b) => a + b, 0);
  const toolBreakdown: ToolBreakdownEntry[] = [...toolMap.entries()]
    .map(([tool, count]) => ({
      tool,
      count,
      pct: totalTools > 0 ? Math.round((count / totalTools) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

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
  const primaryModel = filtered[0]?.models[0] ?? "claude-sonnet-4-6";
  const cacheMetrics: CacheMetrics = {
    totalCacheRead,
    totalCacheCreate,
    hitRate: totalEffective > 0 ? totalCacheRead / totalEffective : 0,
    savingsUSD: computeCacheSavings(totalCacheRead, primaryModel),
  };

  // Cost by project
  const projectCostMap = new Map<
    string,
    { cost: number; inputCost: number; outputCost: number; cacheCost: number }
  >();
  for (const s of filtered) {
    const existing = projectCostMap.get(s.projectName);
    const inputCost = (s.totalInputTokens * 3) / 1_000_000;
    const outputCost = (s.totalOutputTokens * 15) / 1_000_000;
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

  const toolMap = new Map<string, number>();
  for (const s of sessions) {
    for (const [tool, count] of Object.entries(s.toolUsage)) {
      toolMap.set(tool, (toolMap.get(tool) ?? 0) + count);
    }
  }
  const totalTools = [...toolMap.values()].reduce((a, b) => a + b, 0);
  const mostUsedTools: ToolBreakdownEntry[] = [...toolMap.entries()]
    .map(([tool, count]) => ({
      tool,
      count,
      pct: totalTools > 0 ? Math.round((count / totalTools) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const primaryModel = sessions[0]?.models[0] ?? "claude-sonnet-4-6";
  const totalCacheRead = sessions.reduce(
    (sum, s) => sum + s.totalCacheReadTokens,
    0,
  );
  const cacheSavingsUSD = computeCacheSavings(totalCacheRead, primaryModel);

  const projectMap = new Map<
    string,
    { sessions: number; totalHours: number; totalCost: number }
  >();
  for (const s of sessions) {
    const existing = projectMap.get(s.projectName);
    const hours = s.durationMinutes / 60;
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
      ? sessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
        sessions.length
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
    [...sessions].sort((a, b) => b.durationMinutes - a.durationMinutes)[0] ??
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
    mostProductiveDay,
    skillsUsed,
    totalActiveDays: new Set(sessions.map((s) => s.startTime.slice(0, 10)))
      .size,
    longestSession: {
      sessionId: longestSession.sessionId,
      durationMinutes: longestSession.durationMinutes,
      projectName: longestSession.projectName,
    },
    mostExpensiveSession: {
      sessionId: mostExpensiveSession.sessionId,
      cost: mostExpensiveSession.estimatedCost,
      projectName: mostExpensiveSession.projectName,
    },
  };
}
