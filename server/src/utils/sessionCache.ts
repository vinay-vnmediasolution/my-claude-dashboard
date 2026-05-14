import { dataCache } from "../cache/dataCache.js";
import {
  loadAllSessions,
  type LoadedSession,
} from "../processors/sessionAggregator.js";

export async function getSessions(): Promise<LoadedSession[]> {
  const cached = dataCache.get<LoadedSession[]>("sessions");
  if (cached) return cached;
  const sessions = await loadAllSessions();
  dataCache.set("sessions", sessions);
  return sessions;
}
