import type { ParsedMessage, SessionData } from "../types/index.js";

export function mergeSessionParts(
  sessionId: string,
  parts: Array<{ session: SessionData; messages: ParsedMessage[] }>,
): { session: SessionData; messages: ParsedMessage[] } {
  if (parts.length === 0) {
    throw new Error(`No parts to merge for session ${sessionId}`);
  }
  if (parts.length === 1) {
    const only = parts[0];
    return {
      session: { ...only.session, sessionId },
      messages: only.messages,
    };
  }

  // Prefer the main session transcript (most user messages) for display metadata
  const primary = [...parts].sort(
    (a, b) => b.session.userMessageCount - a.session.userMessageCount,
  )[0];

  const models = new Set<string>();
  const entrypoints = new Set<string>();
  const skills = new Set<string>();
  const gitBranches = new Set<string>();
  const unpricedModels = new Set<string>();
  const toolUsage: Record<string, number> = {};
  const toolErrors: Record<string, number> = {};

  let userMessageCount = 0;
  let toolResultCount = 0;
  let assistantMessageCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreateTokens = 0;
  let totalCacheReadTokens = 0;
  let estimatedCost = 0;
  let startTime = "";
  let endTime = "";
  let projectPath = "";
  let aiTitle: string | undefined;
  let firstUserMessage: string | undefined;

  for (const { session } of parts) {
    userMessageCount += session.userMessageCount;
    toolResultCount += session.toolResultCount;
    assistantMessageCount += session.assistantMessageCount;
    totalInputTokens += session.totalInputTokens;
    totalOutputTokens += session.totalOutputTokens;
    totalCacheCreateTokens += session.totalCacheCreateTokens;
    totalCacheReadTokens += session.totalCacheReadTokens;
    estimatedCost += session.estimatedCost;

    session.models.forEach((m) => models.add(m));
    session.entrypoints.forEach((e) => entrypoints.add(e));
    session.skills.forEach((s) => skills.add(s));
    session.gitBranches.forEach((g) => gitBranches.add(g));
    session.unpricedModels.forEach((m) => unpricedModels.add(m));

    for (const [tool, count] of Object.entries(session.toolUsage)) {
      toolUsage[tool] = (toolUsage[tool] ?? 0) + count;
    }

    for (const [tool, count] of Object.entries(session.toolErrors)) {
      toolErrors[tool] = (toolErrors[tool] ?? 0) + count;
    }

    if (!startTime || session.startTime < startTime)
      startTime = session.startTime;
    if (!endTime || session.endTime > endTime) endTime = session.endTime;
    if (!projectPath && session.projectPath) projectPath = session.projectPath;
    if (!aiTitle && session.aiTitle) aiTitle = session.aiTitle;
    if (!firstUserMessage && session.firstUserMessage) {
      firstUserMessage = session.firstUserMessage;
    }
  }

  const durationMs =
    new Date(endTime).getTime() - new Date(startTime).getTime();
  const durationMinutes = Math.max(0, Math.round(durationMs / 60_000));

  const messages = parts
    .flatMap((p) => p.messages)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const session: SessionData = {
    ...primary.session,
    sessionId,
    projectPath: primary.session.projectPath || projectPath,
    projectName: primary.session.projectName,
    aiTitle: primary.session.aiTitle ?? aiTitle,
    firstUserMessage: primary.session.firstUserMessage ?? firstUserMessage,
    startTime,
    endTime,
    durationMinutes,
    userMessageCount,
    toolResultCount,
    assistantMessageCount,
    models: [...models],
    unpricedModels: [...unpricedModels],
    entrypoints: [...entrypoints],
    skills: [...skills],
    gitBranches: [...gitBranches],
    toolUsage,
    toolErrors,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreateTokens,
    totalCacheReadTokens,
    estimatedCost,
  };

  return { session, messages };
}
