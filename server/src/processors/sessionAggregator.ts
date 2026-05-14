import fs from "fs";
import path from "path";
import { CLAUDE_DIR } from "../config.js";
import { parseSession } from "../parsers/sessionParser.js";
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
      const files = (await fs.promises.readdir(projectPath)).filter((f) =>
        f.endsWith(".jsonl"),
      );

      const settled = await Promise.allSettled(
        files.map((file) =>
          parseSession(path.join(projectPath, file), projectDir.name),
        ),
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
