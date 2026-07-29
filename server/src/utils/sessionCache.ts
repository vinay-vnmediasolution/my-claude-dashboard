import { dataCache } from "../cache/dataCache.js";
import type { LoadedSession } from "../types/index.js";
import {
  computeCombinedFingerprint,
  loadAllProviderSessions,
} from "../providers/registry.js";

const FINGERPRINT_KEY = "__data_fingerprint";

export async function getSessions(): Promise<LoadedSession[]> {
  const fingerprint = await computeCombinedFingerprint();
  const cachedFingerprint = dataCache.get<string>(FINGERPRINT_KEY);

  if (cachedFingerprint && cachedFingerprint !== fingerprint) {
    dataCache.invalidate("sessions");
    dataCache.invalidateDerived();
  }

  const cached = dataCache.get<LoadedSession[]>("sessions");
  if (cached) return cached;

  const sessions = await loadAllProviderSessions();
  dataCache.set("sessions", sessions);
  dataCache.set(FINGERPRINT_KEY, fingerprint, Number.MAX_SAFE_INTEGER);
  dataCache.invalidateDerived();
  return sessions;
}
