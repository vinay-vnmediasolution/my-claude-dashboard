import { CACHE_TTL_MS } from "../config.js";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class DataCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  /** Drop overview, insights, and analytics entries (keeps raw sessions if present). */
  invalidateDerived(): void {
    for (const key of this.store.keys()) {
      if (
        key === "overview" ||
        key === "insights" ||
        key.startsWith("analytics:")
      ) {
        this.store.delete(key);
      }
    }
  }

  lastSet(key: string): Date | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return new Date(entry.expiresAt - CACHE_TTL_MS);
  }
}

export const dataCache = new DataCache();
