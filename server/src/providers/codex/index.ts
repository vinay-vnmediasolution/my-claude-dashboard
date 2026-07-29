import fs from "fs";
import type { SessionProvider } from "../types.js";
import { loadAllCodexSessions, sessionsRoot } from "./loader.js";
import { computeCodexFingerprint } from "./fingerprint.js";

export const codexProvider: SessionProvider = {
  id: "codex",
  label: "Codex",

  async isAvailable() {
    try {
      const stat = await fs.promises.stat(sessionsRoot());
      return stat.isDirectory();
    } catch {
      return false;
    }
  },

  loadSessions() {
    return loadAllCodexSessions();
  },

  fingerprint() {
    return computeCodexFingerprint();
  },
};
