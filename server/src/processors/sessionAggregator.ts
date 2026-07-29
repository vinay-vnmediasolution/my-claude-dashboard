import fs from "fs";
import path from "path";
import { CLAUDE_DIR } from "../config.js";
import { parseSession } from "../parsers/sessionParser.js";
import { mergeSessionParts } from "./sessionMerge.js";
import type { SessionData, ParsedMessage } from "../types/index.js";

export interface LoadedSession {
  session: SessionData;
  messages: ParsedMessage[];
}

let inflightLoad: Promise<LoadedSession[]> | null = null;

export async function loadAllSessions(): Promise<LoadedSession[]> {
  if (inflightLoad) return inflightLoad;
  inflightLoad = doLoadAllSessions().finally(() => {
    inflightLoad = null;
  });
  return inflightLoad;
}

async function discoverSessionFileGroups(
  projectPath: string,
): Promise<Map<string, string[]>> {
  const groups = new Map<string, string[]>();

  const addFile = (sessionId: string, filePath: string) => {
    const list = groups.get(sessionId) ?? [];
    list.push(filePath);
    groups.set(sessionId, list);
  };

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(projectPath, { withFileTypes: true });
  } catch {
    return groups;
  }

  for (const entry of entries) {
    const fullPath = path.join(projectPath, entry.name);

    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      addFile(path.basename(entry.name, ".jsonl"), fullPath);
      continue;
    }

    if (!entry.isDirectory()) continue;

    const subagentsDir = path.join(fullPath, "subagents");
    try {
      const subFiles = (await fs.promises.readdir(subagentsDir)).filter((f) =>
        f.endsWith(".jsonl"),
      );
      if (subFiles.length === 0) continue;

      const sessionId = entry.name;
      for (const file of subFiles) {
        addFile(sessionId, path.join(subagentsDir, file));
      }
    } catch {
      // No subagents directory for this folder
    }
  }

  return groups;
}

async function doLoadAllSessions(): Promise<LoadedSession[]> {
  const projectsDir = path.join(CLAUDE_DIR, "projects");

  try {
    await fs.promises.access(projectsDir);
  } catch {
    console.warn(`Projects directory not found: ${projectsDir}`);
    return [];
  }

  const projectDirs = (
    await fs.promises.readdir(projectsDir, { withFileTypes: true })
  ).filter((d) => d.isDirectory());

  const perProjectResults = await Promise.all(
    projectDirs.map(async (projectDir) => {
      const projectPath = path.join(projectsDir, projectDir.name);
      const fileGroups = await discoverSessionFileGroups(projectPath);

      const settled = await Promise.allSettled(
        [...fileGroups.entries()].map(async ([sessionId, filePaths]) => {
          const parts = await Promise.all(
            filePaths.map((filePath) =>
              parseSession(filePath, projectDir.name),
            ),
          );
          return mergeSessionParts(sessionId, parts);
        }),
      );

      const loaded: LoadedSession[] = [];
      for (const result of settled) {
        if (result.status === "rejected") {
          console.warn("Failed to parse session:", result.reason);
          continue;
        }
        const { session, messages } = result.value;
        if (session.userMessageCount > 0 || session.assistantMessageCount > 0) {
          loaded.push({ session, messages });
        }
      }
      return loaded;
    }),
  );

  const all = perProjectResults.flat();
  all.sort((a, b) => b.session.startTime.localeCompare(a.session.startTime));
  return all;
}
