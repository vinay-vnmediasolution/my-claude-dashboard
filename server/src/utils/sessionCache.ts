import { dataCache } from "../cache/dataCache.js";
import {
  loadAllSessions,
  type LoadedSession,
} from "../processors/sessionAggregator.js";
import { computeDataFingerprint } from "./dataFingerprint.js";

const FINGERPRINT_KEY = "__data_fingerprint";

export async function getSessions(): Promise<LoadedSession[]> {
  const fingerprint = await computeDataFingerprint();
  const cachedFingerprint = dataCache.get<string>(FINGERPRINT_KEY);

  if (cachedFingerprint && cachedFingerprint !== fingerprint) {
    dataCache.invalidate("sessions");
    dataCache.invalidateDerived();
  }

  const cached = dataCache.get<LoadedSession[]>("sessions");
  if (cached) return cached;

  const sessions = await loadAllSessions();
  dataCache.set("sessions", sessions);
  dataCache.set(FINGERPRINT_KEY, fingerprint, Number.MAX_SAFE_INTEGER);
  dataCache.invalidateDerived();
  return sessions;
}
