import fs from "fs";
import path from "path";
import { CODEX_DIR } from "../../config.js";
import { parseCodexSession } from "./parser.js";
import type { LoadedSession } from "../../types/index.js";

let inflightLoad: Promise<LoadedSession[]> | null = null;

export function sessionsRoot(): string {
  return path.join(CODEX_DIR, "sessions");
}

/**
 * Rollout files, nested under sessions/YYYY/MM/DD/. The date directories are
 * walked rather than globbed so an unexpected layout change degrades to
 * "found nothing" instead of throwing.
 */
export async function findRolloutFiles(dir: string): Promise<string[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findRolloutFiles(fullPath)));
    } else if (
      entry.isFile() &&
      entry.name.startsWith("rollout-") &&
      entry.name.endsWith(".jsonl")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function loadAllCodexSessions(): Promise<LoadedSession[]> {
  if (inflightLoad) return inflightLoad;
  inflightLoad = doLoadAllCodexSessions().finally(() => {
    inflightLoad = null;
  });
  return inflightLoad;
}

async function doLoadAllCodexSessions(): Promise<LoadedSession[]> {
  const files = await findRolloutFiles(sessionsRoot());

  const settled = await Promise.allSettled(
    files.map((filePath) => parseCodexSession(filePath)),
  );

  const loaded: LoadedSession[] = [];
  for (const result of settled) {
    if (result.status === "rejected") {
      console.warn("Failed to parse Codex session:", result.reason);
      continue;
    }
    const { session, messages } = result.value;
    if (session.userMessageCount > 0 || session.assistantMessageCount > 0) {
      loaded.push({ session, messages });
    }
  }

  loaded.sort((a, b) => b.session.startTime.localeCompare(a.session.startTime));
  return loaded;
}
