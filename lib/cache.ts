interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function createTTLCache<T>(ttlMs: number, maxEntries = 500) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      // Bump recency for LRU eviction
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    set(key: string, value: T, ttlOverrideMs?: number): void {
      if (store.size >= maxEntries) {
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) store.delete(oldestKey);
      }
      store.set(key, { value, expiresAt: Date.now() + (ttlOverrideMs ?? ttlMs) });
    },
  };
}
