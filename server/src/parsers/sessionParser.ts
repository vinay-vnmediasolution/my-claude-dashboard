import path from "path";
import { readAllJsonlLines } from "./jsonlReader.js";
import { computeMessageCost } from "../processors/costCalculator.js";
import { BILLING_API_START_DATE } from "../config.js";
import type {
  SessionData,
  ParsedMessage,
  RawAssistantUsage,
  BillingSource,
} from "../types/index.js";

interface RawEntry {
  type?: string;
  parentUuid?: string;
  uuid?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  entrypoint?: string;
  attributionSkill?: string;
  // user entries
  message?: RawUserMessage | RawAssistantMessage;
  // ai-title
  title?: string;
}

interface RawUserMessage {
  role: "user";
  content: string | Array<{ type: string; text?: string }>;
}

interface RawAssistantMessage {
  role: "assistant";
  model?: string;
  content?: Array<RawContentBlock>;
  usage?: RawAssistantUsage;
}

interface RawContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  thinking?: string;
}

function extractUserText(message: RawUserMessage): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join(" ")
      .trim();
  }
  return "";
}

function extractAssistantText(content: RawContentBlock[]): string {
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join(" ")
    .slice(0, 500)
    .trim();
}

function extractTools(
  content: RawContentBlock[],
): Array<{ name: string; input?: Record<string, unknown> }> {
  return content
    .filter((b) => b.type === "tool_use" && b.name)
    .map((b) => ({ name: b.name!, input: b.input }));
}

function deriveBillingSource(
  serviceTiers: Set<string>,
  sessionStart: string,
): BillingSource {
  // If the user configured an API start date and this session falls on/after it,
  // treat it as direct API billing. The presence of ANTHROPIC_API_KEY in the
  // environment is NOT a reliable signal — it may be set for app development
  // while Claude Code itself still runs on a subscription via OAuth.
  if (BILLING_API_START_DATE && sessionStart >= BILLING_API_START_DATE) {
    return "api";
  }
  if (serviceTiers.has("priority")) return "max";
  return "pro";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_SEGMENTS = new Set([
  "workspaces",
  "instances",
  "default",
  "support",
  "library",
  "application",
]);

function toTitleCase(seg: string): string {
  return seg
    .split(/[-_ ]+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
}

function deriveProjectName(cwd: string): string {
  const parts = cwd.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i];
    if (!UUID_RE.test(seg) && !SKIP_SEGMENTS.has(seg.toLowerCase())) {
      return toTitleCase(seg);
    }
  }
  return toTitleCase(parts[parts.length - 1] ?? cwd);
}

export async function parseSession(
  filePath: string,
  projectDirKey: string,
): Promise<{ session: SessionData; messages: ParsedMessage[] }> {
  const sessionId = path.basename(filePath, ".jsonl");
  const rawLines = await readAllJsonlLines(filePath);

  let projectPath = "";
  let aiTitle: string | undefined;
  let firstUserMessage: string | undefined;
  let minTimestamp = "";
  let maxTimestamp = "";
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  const models = new Set<string>();
  const entrypoints = new Set<string>();
  const skills = new Set<string>();
  const gitBranches = new Set<string>();
  const serviceTiers = new Set<string>();
  const toolUsage: Record<string, number> = {};
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreateTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCost = 0;

  const messages: ParsedMessage[] = [];

  for (const raw of rawLines) {
    const entry = raw as RawEntry;
    if (!entry || typeof entry !== "object") continue;

    const ts = entry.timestamp ?? "";
    if (ts) {
      if (!minTimestamp || ts < minTimestamp) minTimestamp = ts;
      if (!maxTimestamp || ts > maxTimestamp) maxTimestamp = ts;
    }

    if (entry.cwd && !projectPath) projectPath = entry.cwd;
    if (entry.entrypoint) entrypoints.add(entry.entrypoint);
    if (entry.gitBranch) gitBranches.add(entry.gitBranch);
    if (entry.attributionSkill) skills.add(entry.attributionSkill);

    const entryType = entry.type;

    if (entryType === "ai-title" && entry.title) {
      aiTitle = entry.title;
      continue;
    }

    if (
      entryType === "user" &&
      entry.message &&
      (entry.message as RawUserMessage).role === "user"
    ) {
      userMessageCount++;
      const text = extractUserText(entry.message as RawUserMessage);
      if (!firstUserMessage && text) firstUserMessage = text.slice(0, 120);

      messages.push({
        uuid: entry.uuid ?? crypto.randomUUID(),
        parentUuid: entry.parentUuid ?? null,
        type: "user",
        timestamp: ts,
        sessionId,
        cwd: entry.cwd ?? projectPath,
        gitBranch: entry.gitBranch,
        entrypoint: entry.entrypoint,
        attributionSkill: entry.attributionSkill,
        userText: text,
      });
      continue;
    }

    if (
      entryType === "assistant" &&
      entry.message &&
      (entry.message as RawAssistantMessage).role === "assistant"
    ) {
      const msg = entry.message as RawAssistantMessage;
      if (!msg.model || msg.model === "<synthetic>") continue;

      assistantMessageCount++;
      models.add(msg.model);

      const usage = msg.usage;
      let msgCost = 0;
      if (usage) {
        totalInputTokens += usage.input_tokens ?? 0;
        totalOutputTokens += usage.output_tokens ?? 0;
        totalCacheCreateTokens += usage.cache_creation_input_tokens ?? 0;
        totalCacheReadTokens += usage.cache_read_input_tokens ?? 0;
        if (usage.service_tier) serviceTiers.add(usage.service_tier);
        msgCost = computeMessageCost(usage, msg.model);
        totalCost += msgCost;
      }

      const content = msg.content ?? [];
      const tools = extractTools(content);
      tools.forEach((t) => {
        toolUsage[t.name] = (toolUsage[t.name] ?? 0) + 1;
      });

      const hasThinking = content.some((b) => b.type === "thinking");
      const textContent = extractAssistantText(content);

      messages.push({
        uuid: entry.uuid ?? crypto.randomUUID(),
        parentUuid: entry.parentUuid ?? null,
        type: "assistant",
        timestamp: ts,
        sessionId,
        cwd: entry.cwd ?? projectPath,
        gitBranch: entry.gitBranch,
        entrypoint: entry.entrypoint,
        attributionSkill: entry.attributionSkill,
        model: msg.model,
        usage,
        cost: msgCost,
        tools,
        hasThinking,
        textContent,
      });
    }
  }

  const startTime = minTimestamp || new Date().toISOString();
  const endTime = maxTimestamp || startTime;
  const durationMs =
    new Date(endTime).getTime() - new Date(startTime).getTime();
  const durationMinutes = Math.max(0, Math.round(durationMs / 60_000));

  const session: SessionData = {
    sessionId,
    projectDirKey,
    projectPath,
    projectName: deriveProjectName(projectPath),
    aiTitle,
    firstUserMessage,
    startTime,
    endTime,
    durationMinutes,
    userMessageCount,
    assistantMessageCount,
    models: [...models],
    entrypoints: [...entrypoints],
    skills: [...skills],
    gitBranches: [...gitBranches],
    toolUsage,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreateTokens,
    totalCacheReadTokens,
    estimatedCost: totalCost,
    billingSource: deriveBillingSource(serviceTiers, startTime),
  };

  return { session, messages };
}
