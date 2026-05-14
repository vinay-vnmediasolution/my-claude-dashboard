import fs from "fs";
import path from "path";
import { CLAUDE_DIR } from "../config.js";
import { parseSession } from "../parsers/sessionParser.js";
import type { SessionData, ParsedMessage } from "../types/index.js";

export interface LoadedSession {
  session: SessionData;
  messages: ParsedMessage[];
}

export async function loadAllSessions(): Promise<LoadedSession[]> {
  const projectsDir = path.join(CLAUDE_DIR, "projects");

  if (!fs.existsSync(projectsDir)) {
    console.warn(`Projects directory not found: ${projectsDir}`);
    return [];
  }

  const loaded: LoadedSession[] = [];
  const projectDirs = fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsDir, projectDir.name);
    const files = fs
      .readdirSync(projectPath)
      .filter((f) => f.endsWith(".jsonl"));

    for (const file of files) {
      const filePath = path.join(projectPath, file);
      try {
        const result = await parseSession(filePath, projectDir.name);
        // Only include sessions with actual messages
        if (
          result.session.userMessageCount > 0 ||
          result.session.assistantMessageCount > 0
        ) {
          loaded.push(result);
        }
      } catch (err) {
        console.warn(`Failed to parse ${filePath}:`, err);
      }
    }
  }

  // Sort sessions newest first
  loaded.sort((a, b) => b.session.startTime.localeCompare(a.session.startTime));
  return loaded;
}
