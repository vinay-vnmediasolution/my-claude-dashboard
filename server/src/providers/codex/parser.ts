import path from "path";
import { readAllJsonlLines } from "../../parsers/jsonlReader.js";
import {
  computeMessageCost,
  isModelPriced,
} from "../../processors/costCalculator.js";
import { deriveProjectName } from "../../utils/projectName.js";
import { computeActiveMinutes } from "../../utils/activeTime.js";
import type {
  SessionData,
  ParsedMessage,
  RawAssistantUsage,
} from "../../types/index.js";

/**
 * One line of a Codex rollout file. Every line carries a top-level type and
 * timestamp; the shape of `payload` depends on that type, so it is modelled as
 * one optional-field union rather than a discriminated type — the parser reads
 * only the fields it recognises and ignores the rest.
 */
interface CodexEntry {
  type?: string;
  timestamp?: string;
  payload?: CodexPayload;
}

interface CodexPayload {
  type?: string;
  // session_meta
  session_id?: string | null;
  cwd?: string;
  originator?: string;
  // session_meta and turn_context both name the model
  model?: string;
  // event_msg: token_count
  info?: {
    total_token_usage?: CodexTokenUsage | null;
    last_token_usage?: CodexTokenUsage | null;
  };
  // event_msg: user_message, agent_message
  message?: string;
  // response_item: function_call, custom_tool_call
  name?: string;
  call_id?: string;
  // event_msg: exec_command_end
  status?: string;
  exit_code?: number;
  // event_msg: patch_apply_end
  success?: boolean;
  // event_msg: mcp_tool_call_end — a serialised Rust Result
  result?: { Ok?: { isError?: boolean } | null; Err?: unknown };
}

interface CodexTokenUsage {
  input_tokens?: number;
  cached_input_tokens?: number;
  cache_write_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
}

/**
 * Response items that are tool invocations but carry no `name` field. Their
 * type is the only identifier, so it doubles as the tool name.
 */
const UNNAMED_TOOL_CALLS: Record<string, string> = {
  web_search_call: "web_search",
  tool_search_call: "tool_search",
  image_generation_call: "image_generation",
};

const TOOL_OUTPUT_TYPES = new Set([
  "function_call_output",
  "custom_tool_call_output",
  "tool_search_output",
]);

/**
 * Threads started from a Codex/ChatGPT app project run in a generated
 * workspace under ~/.codex/.chatgpt-projects/g-p-<hash>, which carries no
 * repository name to derive from. Naming them by the hash buries real usage
 * behind an opaque label, so they are grouped under one readable name.
 */
const CHATGPT_PROJECT_SEGMENT = ".chatgpt-projects";
const CHATGPT_PROJECT_NAME = "ChatGPT Project";

function deriveCodexProjectName(cwd: string): string {
  if (cwd.split("/").includes(CHATGPT_PROJECT_SEGMENT)) {
    return CHATGPT_PROJECT_NAME;
  }
  return deriveProjectName(cwd);
}

const ROLLOUT_ID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Session id from the rollout filename rather than from session_meta, for two
 * reasons: older rollouts record session_id as null, and a forked thread
 * writes a second session_meta naming the thread it branched from. Keying on
 * the payload would merge a fork into its parent and double-count its tokens.
 */
function sessionIdFromFile(filePath: string): string {
  const base = path.basename(filePath, ".jsonl");
  return ROLLOUT_ID_RE.exec(base)?.[1] ?? base;
}

/**
 * Forking or rolling back a thread writes a new rollout that replays the whole
 * parent transcript — including its per-request token counts — before any new
 * work happens. Those requests were already billed to the parent thread, so
 * counting the replay again inflates the total.
 *
 * The replay is a synchronous file write: the observed case wrote 715 entries
 * in 23ms, while a genuine turn costs at least one network round-trip. One
 * second is far longer than any replay write and far shorter than any real
 * turn, so entries within that window of the fork are treated as replayed and
 * everything after it as work actually done in the new thread.
 */
const REPLAY_WINDOW_MS = 1000;

/**
 * Timestamp up to which entries are replayed parent history, or 0 when this
 * rollout is not a fork. A fork is identified by a session_meta naming a
 * session other than the file's own — older rollouts leave session_id null,
 * which names nothing and is not a fork.
 */
function computeReplayCutoff(entries: CodexEntry[], sessionId: string): number {
  const isFork = entries.some(
    (e) =>
      e?.type === "session_meta" &&
      typeof e.payload?.session_id === "string" &&
      e.payload.session_id !== sessionId,
  );
  if (!isFork) return 0;

  const firstMs = entries
    .map((e) => new Date(e?.timestamp ?? "").getTime())
    .find((ms) => Number.isFinite(ms));

  return firstMs === undefined ? 0 : firstMs + REPLAY_WINDOW_MS;
}

/**
 * Per-request usage mapped onto the Anthropic-shaped usage record the rest of
 * the dashboard works with.
 *
 * Codex reports `input_tokens` inclusive of `cached_input_tokens`, and
 * `output_tokens` inclusive of `reasoning_output_tokens` (their sum equals the
 * reported `total_tokens`). Cache reads are therefore subtracted out of input
 * rather than added on top, which would double-count them.
 */
function toUsage(usage: CodexTokenUsage): RawAssistantUsage {
  const input = usage.input_tokens ?? 0;
  const cacheRead = usage.cached_input_tokens ?? 0;
  return {
    input_tokens: Math.max(0, input - cacheRead),
    output_tokens: usage.output_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_write_input_tokens ?? 0,
    cache_read_input_tokens: cacheRead,
  };
}

/**
 * Whether a completed tool event reports failure. Codex records tool outcomes
 * on separate `*_end` events rather than on the tool output itself, and each
 * family reports failure differently.
 */
function isFailedToolEvent(payload: CodexPayload): boolean {
  switch (payload.type) {
    case "exec_command_end":
      return payload.status === "failed" || (payload.exit_code ?? 0) !== 0;
    case "patch_apply_end":
      return payload.success === false;
    case "mcp_tool_call_end":
      return (
        payload.result?.Err !== undefined ||
        payload.result?.Ok?.isError === true
      );
    default:
      return false;
  }
}

const TOOL_END_TYPES = new Set([
  "exec_command_end",
  "patch_apply_end",
  "mcp_tool_call_end",
]);

export async function parseCodexSession(
  filePath: string,
): Promise<{ session: SessionData; messages: ParsedMessage[] }> {
  const sessionId = sessionIdFromFile(filePath);
  const entries = (await readAllJsonlLines(filePath)) as CodexEntry[];
  const replayCutoff = computeReplayCutoff(entries, sessionId);

  let projectPath = "";
  let firstUserMessage: string | undefined;
  let minTimestamp = "";
  let maxTimestamp = "";
  let userMessageCount = 0;
  let toolResultCount = 0;
  let assistantMessageCount = 0;
  const models = new Set<string>();
  const unpricedModels = new Set<string>();
  const entrypoints = new Set<string>();
  const toolUsage: Record<string, number> = {};
  const toolErrors: Record<string, number> = {};
  const toolNamesByCallId = new Map<string, string>();
  const timestamps: number[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreateTokens = 0;
  let totalCacheReadTokens = 0;

  const messages: ParsedMessage[] = [];
  const perRequestUsage: RawAssistantUsage[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const ts = entry.timestamp ?? "";
    if (replayCutoff && new Date(ts).getTime() <= replayCutoff) continue;

    if (ts) {
      if (!minTimestamp || ts < minTimestamp) minTimestamp = ts;
      if (!maxTimestamp || ts > maxTimestamp) maxTimestamp = ts;
      timestamps.push(new Date(ts).getTime());
    }

    const payload = entry.payload;
    if (!payload || typeof payload !== "object") continue;

    if (entry.type === "session_meta") {
      if (payload.cwd && !projectPath) projectPath = payload.cwd;
      if (payload.originator) entrypoints.add(payload.originator);
      if (payload.model) models.add(payload.model);
      continue;
    }

    if (entry.type === "turn_context") {
      if (payload.cwd && !projectPath) projectPath = payload.cwd;
      if (payload.model) models.add(payload.model);
      continue;
    }

    if (entry.type === "response_item") {
      const toolName =
        payload.type === "function_call" || payload.type === "custom_tool_call"
          ? (payload.name ?? "unknown")
          : UNNAMED_TOOL_CALLS[payload.type ?? ""];

      if (toolName) {
        toolUsage[toolName] = (toolUsage[toolName] ?? 0) + 1;
        if (payload.call_id) toolNamesByCallId.set(payload.call_id, toolName);

        messages.push({
          uuid: crypto.randomUUID(),
          parentUuid: null,
          type: "assistant",
          timestamp: ts,
          sessionId,
          cwd: projectPath,
          tools: [{ name: toolName }],
        });
        continue;
      }

      if (TOOL_OUTPUT_TYPES.has(payload.type ?? "")) toolResultCount++;
      continue;
    }

    if (entry.type !== "event_msg") continue;

    if (payload.type === "token_count") {
      // Per-request usage, not the cumulative `total_token_usage` alongside it.
      // Summing the cumulative field would multiply spend by the number of
      // requests in the session.
      const last = payload.info?.last_token_usage;
      if (last) perRequestUsage.push(toUsage(last));
      continue;
    }

    if (payload.type === "user_message") {
      userMessageCount++;
      const text = payload.message ?? "";
      if (!firstUserMessage && text) firstUserMessage = text.slice(0, 120);
      messages.push({
        uuid: crypto.randomUUID(),
        parentUuid: null,
        type: "user",
        timestamp: ts,
        sessionId,
        cwd: projectPath,
        userText: text,
        isToolResult: false,
      });
      continue;
    }

    if (payload.type === "agent_message") {
      assistantMessageCount++;
      messages.push({
        uuid: crypto.randomUUID(),
        parentUuid: null,
        type: "assistant",
        timestamp: ts,
        sessionId,
        cwd: projectPath,
        textContent: (payload.message ?? "").slice(0, 500),
      });
      continue;
    }

    if (TOOL_END_TYPES.has(payload.type ?? "") && isFailedToolEvent(payload)) {
      const name = toolNamesByCallId.get(payload.call_id ?? "") ?? "unknown";
      toolErrors[name] = (toolErrors[name] ?? 0) + 1;
    }
  }

  for (const usage of perRequestUsage) {
    totalInputTokens += usage.input_tokens;
    totalOutputTokens += usage.output_tokens;
    totalCacheCreateTokens += usage.cache_creation_input_tokens;
    totalCacheReadTokens += usage.cache_read_input_tokens;
  }

  // A rollout file records exactly one model, so all of its usage is priced at
  // that model's rate. Codex models have no MODEL_PRICING entry, so this comes
  // out at zero — see resolvePricing for why they are not costed at Anthropic's
  // fallback rate — and the model is flagged so the gap is visible in the UI.
  const model = [...models][0] ?? "unknown";
  if (!isModelPriced(model)) unpricedModels.add(model);
  const estimatedCost = perRequestUsage.reduce(
    (sum, usage) => sum + computeMessageCost(usage, "codex", model),
    0,
  );

  const startTime = minTimestamp || new Date().toISOString();
  const endTime = maxTimestamp || startTime;
  const durationMs =
    new Date(endTime).getTime() - new Date(startTime).getTime();

  const session: SessionData = {
    provider: "codex",
    sessionId,
    projectDirKey: projectPath,
    projectPath,
    projectName: deriveCodexProjectName(projectPath),
    firstUserMessage,
    startTime,
    endTime,
    durationMinutes: Math.max(0, Math.round(durationMs / 60_000)),
    activeMinutes: computeActiveMinutes(timestamps),
    userMessageCount,
    toolResultCount,
    assistantMessageCount,
    models: [...models],
    unpricedModels: [...unpricedModels],
    entrypoints: [...entrypoints],
    // Codex records neither skill attribution nor the git branch in rollouts.
    skills: [],
    gitBranches: [],
    toolUsage,
    toolErrors,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreateTokens,
    totalCacheReadTokens,
    estimatedCost,
    // Codex billing is an OpenAI subscription or API key the rollout never
    // names, so there is nothing to infer here.
    billingSource: "unknown",
  };

  return { session, messages };
}
