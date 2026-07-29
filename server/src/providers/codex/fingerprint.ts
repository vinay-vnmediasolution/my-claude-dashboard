import fs from "fs";
import { findRolloutFiles, sessionsRoot } from "./loader.js";

export async function computeCodexFingerprint(): Promise<string> {
  const files = await findRolloutFiles(sessionsRoot());

  let maxMtimeMs = 0;
  for (const file of files) {
    try {
      const stat = await fs.promises.stat(file);
      maxMtimeMs = Math.max(maxMtimeMs, stat.mtimeMs);
    } catch {
      // File vanished between listing and stat — ignore it.
    }
  }

  return `${files.length}:${maxMtimeMs}`;
}
