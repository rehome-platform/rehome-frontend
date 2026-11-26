import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import {
  DEFAULT_STALE_TIME_MS,
  SHORT_STALE_TIME_MS,
  STATIC_STALE_TIME_MS,
  createSessionQueryCache,
} from '../../../utils/sessionQueryCache.js';

export { DEFAULT_STALE_TIME_MS, SHORT_STALE_TIME_MS, STATIC_STALE_TIME_MS };

export const DASHBOARD_STALE_TIME_MS = 60_000;

export const AdminCacheContext = createContext(null);

function useSafeAuthUser() {
  try {
    return useAuth()?.user || null;
  } catch {
    return null;
  }
}

export function notifyAdminCacheInvalidate(prefixes = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('admin:cache-invalidate', { detail: { prefixes } }));
}

export function AdminCacheProvider({ children }) {
  const user = useSafeAuthUser();
  const cacheRef = useRef(null);
  if (!cacheRef.current) {
    cacheRef.current = createSessionQueryCache();
  }

  const userScope = user?.id || user?.accountId || user?.email || 'anon';
  const prevScopeRef = useRef(userScope);
  if (prevScopeRef.current !== userScope) {
    cacheRef.current.clear();
    prevScopeRef.current = userScope;
  }

  useEffect(() => {
    const cache = cacheRef.current;
    const handleClear = () => cache.clear();
    const handleInvalidate = (event) => {
      cache.invalidate(event?.detail?.prefixes ?? null);
    };

    window.addEventListener('auth:logout', handleClear);
    window.addEventListener('auth:expired', handleClear);
    window.addEventListener('admin:cache-invalidate', handleInvalidate);
    return () => {
      window.removeEventListener('auth:logout', handleClear);
      window.removeEventListener('auth:expired', handleClear);
      window.removeEventListener('admin:cache-invalidate', handleInvalidate);
    };
  }, []);

  const value = useMemo(() => {
    const cache = cacheRef.current;
    return {
      cache,
      invalidate: (prefixes = null) => cache.invalidate(prefixes),
      evict: (prefixes = null) => cache.evict(prefixes),
      clear: () => cache.clear(),
    };
  }, []);

  return (
    <AdminCacheContext.Provider value={value}>
      {children}
    </AdminCacheContext.Provider>
  );
}

export function useAdminCache() {
  return useContext(AdminCacheContext)?.cache ?? null;
}

export function useAdminCacheActions() {
  return useContext(AdminCacheContext);
}

function getErrorStatus(err) {
  return err?.response?.status ?? err?.status ?? null;
}

/**
 * Stale-while-revalidate query hook backed by AdminLayout's session cache.
 * Falls back to normal state fetching when rendered outside AdminCacheProvider.
 */
export function useAdminQuery(cacheKey, fetcher, options = {}) {
  const {
    enabled = true,
    staleTime = DEFAULT_STALE_TIME_MS,
    initialData = null,
    keepPreviousData = false,
    onSuccess,
    onError,
  } = options;

  const cache = useAdminCache();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  const [data, setData] = useState(() => {
    const entry = cache && cacheKey ? cache.read(cacheKey) : null;
    return entry ? entry.data : initialData;
  });
  const [loading, setLoading] = useState(() => {
    if (!enabled) return false;
    const entry = cache && cacheKey ? cache.read(cacheKey) : null;
    return !entry;
  });
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  const reqSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async ({ force = false } = {}) => {
      if (!enabled) {
        setLoading(false);
        setIsFetching(false);
        return null;
      }

      const cached = cache && cacheKey ? cache.read(cacheKey) : null;

      // Case A: Fresh cache hit
      if (!force && cached && cache.isFresh(cached, staleTime)) {
        setData(cached.data);
        setLoading(false);
        setIsFetching(false);
        setError(null);
        return cached.data;
      }

      const reqId = ++reqSeqRef.current;
      const hasCached = Boolean(cached);

      // Case B: Stale cache hit -> render cached immediately and revalidate silently
      if (hasCached) {
        setData(cached.data);
        setLoading(false);
        setIsFetching(true);
        setError(null);
      } else {
        // Case C: Cache miss
        if (!keepPreviousData) {
          setData(initialDataRef.current);
        }
        setLoading(true);
        setIsFetching(true);
        setError(null);
      }

      try {
        const result = await fetcherRef.current();
        if (!mountedRef.current || reqId !== reqSeqRef.current) return null;
        if (cache && cacheKey) {
          cache.write(cacheKey, result);
        }
        setData(result);
        setError(null);
        onSuccessRef.current?.(result);
        return result;
      } catch (err) {
        if (!mountedRef.current || reqId !== reqSeqRef.current) return null;
        const status = getErrorStatus(err);
        if (hasCached && [401, 403, 404].includes(status)) {
          cache?.evict(cacheKey);
          setData(initialDataRef.current);
          setError(err);
        } else if (!hasCached || force) {
          setError(err);
        }
        onErrorRef.current?.(err);
        return null;
      } finally {
        if (mountedRef.current && reqId === reqSeqRef.current) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    },
    [cache, cacheKey, enabled, keepPreviousData, staleTime],
  );

  useEffect(() => {
    execute({ force: false });
  }, [execute]);

  const refresh = useCallback(() => execute({ force: true }), [execute]);

  return { data, setData, loading, isFetching, error, refresh };
}
