import type { LoadedSession, ProviderId } from "../types/index.js";

/**
 * A source of coding-agent sessions on this machine.
 *
 * Each provider owns its own on-disk layout and transcript format, and is
 * responsible for producing SessionData in the shape the analytics layer
 * expects. Everything downstream — aggregation, pricing, the API, the UI —
 * works against SessionData and never against a provider's raw files.
 */
export interface SessionProvider {
  readonly id: ProviderId;
  /** Human-readable name, shown in provider breakdowns. */
  readonly label: string;

  /**
   * Whether this provider's data exists on this machine. Providers whose
   * tooling was never installed are skipped rather than reported as empty,
   * so an absent provider is distinguishable from one with no sessions.
   */
  isAvailable(): Promise<boolean>;

  loadSessions(): Promise<LoadedSession[]>;

  /**
   * Cheap signature of the provider's data, used to detect changes without
   * re-parsing. Must change whenever loadSessions() would return something
   * different, and must not require reading transcript contents.
   */
  fingerprint(): Promise<string>;
}
