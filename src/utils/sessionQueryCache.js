/**
 * Lightweight per-session stale-while-revalidate query cache.
 * Stores entries in memory for the current authenticated session only.
 */

export const DEFAULT_STALE_TIME_MS = 30_000;
export const SHORT_STALE_TIME_MS = 15_000;
export const STATIC_STALE_TIME_MS = 5 * 60_000;

function matchesPrefix(key, prefixList) {
  if (!prefixList || prefixList.length === 0) return false;
  return prefixList.some((prefix) => {
    if (!prefix) return false;
    return key === prefix || key.startsWith(prefix);
  });
}

function normalizePrefixes(prefixes) {
  if (prefixes == null || prefixes === '*') return null;
  const list = (Array.isArray(prefixes) ? prefixes : [prefixes]).filter(Boolean);
  return list.length > 0 ? list : [];
}

/**
 * Create an isolated in-memory query cache supporting staleTime,
 * stale-while-revalidate invalidation, and hard eviction.
 */
export function createSessionQueryCache() {
  const store = new Map();

  const read = (key) => {
    if (!key) return null;
    return store.get(key) ?? null;
  };

  const write = (key, data) => {
    if (!key) return null;
    const entry = {
      data,
      updatedAt: Date.now(),
      stale: false,
    };
    store.set(key, entry);
    return entry;
  };

  const isFresh = (entry, staleTime = DEFAULT_STALE_TIME_MS) => {
    if (!entry || entry.stale) return false;
    if (!Number.isFinite(staleTime) || staleTime <= 0) return false;
    return Date.now() - entry.updatedAt < staleTime;
  };

  const invalidate = (prefixes = null) => {
    if (prefixes == null || prefixes === '*') {
      for (const [key, entry] of store.entries()) {
        store.set(key, { ...entry, stale: true });
      }
      return;
    }
    const list = normalizePrefixes(prefixes);
    if (!list || list.length === 0) return;
    for (const [key, entry] of store.entries()) {
      if (matchesPrefix(key, list)) {
        store.set(key, { ...entry, stale: true });
      }
    }
  };

  const evict = (prefixes = null) => {
    if (prefixes == null || prefixes === '*') {
      store.clear();
      return;
    }
    const list = normalizePrefixes(prefixes);
    if (!list || list.length === 0) return;
    for (const key of Array.from(store.keys())) {
      if (matchesPrefix(key, list)) {
        store.delete(key);
      }
    }
  };

  const clear = () => {
    store.clear();
  };

  return {
    store,
    read,
    write,
    isFresh,
    invalidate,
    evict,
    clear,
    has: (key) => Boolean(key && store.has(key)),
    get: (key) => (key ? store.get(key)?.data : undefined),
    set: (key, data) => {
      write(key, data);
      return store;
    },
    delete: (key) => (key ? store.delete(key) : false),
  };
}
