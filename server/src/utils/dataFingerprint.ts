import fs from "fs";
import path from "path";
import { CLAUDE_DIR } from "../config.js";

async function collectJsonlStats(
  dir: string,
): Promise<{ count: number; maxMtimeMs: number }> {
  let count = 0;
  let maxMtimeMs = 0;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return { count, maxMtimeMs };
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectJsonlStats(fullPath);
      count += nested.count;
      maxMtimeMs = Math.max(maxMtimeMs, nested.maxMtimeMs);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      const stat = await fs.promises.stat(fullPath);
      count++;
      maxMtimeMs = Math.max(maxMtimeMs, stat.mtimeMs);
    }
  }

  return { count, maxMtimeMs };
}

export async function computeDataFingerprint(): Promise<string> {
  const projectsDir = path.join(CLAUDE_DIR, "projects");
  const { count, maxMtimeMs } = await collectJsonlStats(projectsDir);
  return `${count}:${maxMtimeMs}`;
}
