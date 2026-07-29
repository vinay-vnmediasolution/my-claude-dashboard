import type { LoadedSession, ProviderMeta } from "../types/index.js";
import type { SessionProvider } from "./types.js";
import { claudeCodeProvider } from "./claudeCode/index.js";

/**
 * Every provider the dashboard knows how to read. Adding a coding agent means
 * appending to this list — nothing downstream needs to change.
 */
export const providers: SessionProvider[] = [claudeCodeProvider];

async function availableProviders(): Promise<SessionProvider[]> {
  const flags = await Promise.all(providers.map((p) => p.isAvailable()));
  return providers.filter((_, i) => flags[i]);
}

/**
 * Sessions from every available provider. A provider that throws is skipped
 * with a logged warning rather than taking down the whole load — one agent's
 * malformed transcript should not blank the dashboard for the others.
 */
export async function loadAllProviderSessions(): Promise<LoadedSession[]> {
  const active = await availableProviders();

  const results = await Promise.allSettled(
    active.map(async (p) => p.loadSessions()),
  );

  const sessions: LoadedSession[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sessions.push(...result.value);
    } else {
      console.error(
        `Provider "${active[i].id}" failed to load sessions:`,
        result.reason,
      );
    }
  });
  return sessions;
}

/**
 * Combined signature across available providers. Includes each provider's id
 * so that a provider appearing or disappearing also invalidates the cache.
 */
export async function computeCombinedFingerprint(): Promise<string> {
  const active = await availableProviders();
  const parts = await Promise.all(
    active.map(async (p) => `${p.id}=${await p.fingerprint()}`),
  );
  return parts.sort().join("|");
}

export async function describeProviders(
  sessions: LoadedSession[],
): Promise<ProviderMeta[]> {
  const flags = await Promise.all(providers.map((p) => p.isAvailable()));
  return providers.map((p, i) => ({
    id: p.id,
    label: p.label,
    available: flags[i],
    sessions: sessions.filter((s) => s.session.provider === p.id).length,
  }));
}
