import fs from "fs";
import path from "path";
import { CLAUDE_DIR } from "../../config.js";
import type { DataCoverage } from "../../types/index.js";

interface HistoryEntry {
  sessionId?: string;
  project?: string;
  timestamp?: number;
}

/**
 * Claude Code prunes transcripts it has not touched for `cleanupPeriodDays`
 * (30 by default), but ~/.claude/history.jsonl keeps a prompt-level record
 * long after the transcript itself is gone. Comparing the two tells us how
 * much of the user's history the dashboard can actually account for, so
 * totals can be labelled as a window rather than presented as all-time.
 *
 * History records prompts only — no token usage — so deleted sessions can be
 * counted and dated but their cost can never be recovered.
 */
export async function readSessionHistory(): Promise<HistoryEntry[]> {
  const historyPath = path.join(CLAUDE_DIR, "history.jsonl");

  let raw: string;
  try {
    raw = await fs.promises.readFile(historyPath, "utf8");
  } catch {
    return [];
  }

  const entries: HistoryEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as HistoryEntry);
    } catch {
      // Skip malformed lines rather than failing the whole read
    }
  }
  return entries;
}

export async function computeDataCoverage(
  presentSessionIds: string[],
): Promise<DataCoverage> {
  const entries = await readSessionHistory();

  const firstSeen = new Map<string, number>();
  const projects = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.sessionId) continue;
    if (entry.project) projects.set(entry.sessionId, entry.project);
    const ts = entry.timestamp;
    if (typeof ts !== "number") continue;
    const existing = firstSeen.get(entry.sessionId);
    if (existing === undefined || ts < existing) {
      firstSeen.set(entry.sessionId, ts);
    }
  }

  if (firstSeen.size === 0) {
    return {
      historyAvailable: false,
      knownSessions: 0,
      sessionsWithTranscript: presentSessionIds.length,
      missingTranscripts: 0,
      missingProjects: [],
      historyStart: "",
      earliestSurvivingTranscript: "",
    };
  }

  const present = new Set(presentSessionIds);
  const missing = [...firstSeen.keys()].filter((id) => !present.has(id));

  const missingProjects = [
    ...new Set(
      missing
        .map((id) => projects.get(id))
        .filter((p): p is string => Boolean(p)),
    ),
  ].sort();

  const iso = (ms: number) => new Date(ms).toISOString();
  const survivingTimes = [...firstSeen.entries()]
    .filter(([id]) => present.has(id))
    .map(([, ts]) => ts);

  return {
    historyAvailable: true,
    knownSessions: firstSeen.size,
    sessionsWithTranscript: firstSeen.size - missing.length,
    missingTranscripts: missing.length,
    missingProjects,
    historyStart: iso(Math.min(...firstSeen.values())),
    earliestSurvivingTranscript: survivingTimes.length
      ? iso(Math.min(...survivingTimes))
      : "",
  };
}
