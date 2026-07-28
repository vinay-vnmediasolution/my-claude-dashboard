import fs from "fs";
import path from "path";
import { CLAUDE_DIR } from "../../config.js";
import type { SessionProvider } from "../types.js";
import { loadAllSessions } from "./loader.js";
import { computeDataFingerprint } from "./fingerprint.js";

export const claudeCodeProvider: SessionProvider = {
  id: "claude-code",
  label: "Claude Code",

  async isAvailable() {
    try {
      const stat = await fs.promises.stat(path.join(CLAUDE_DIR, "projects"));
      return stat.isDirectory();
    } catch {
      return false;
    }
  },

  loadSessions() {
    return loadAllSessions();
  },

  fingerprint() {
    return computeDataFingerprint();
  },
};

export { computeDataCoverage } from "./coverage.js";
