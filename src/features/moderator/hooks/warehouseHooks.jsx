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
import { isFixtureMode } from '../config/warehouseContract.js';
import { normalizeError, warehouseOf } from '../models/warehouseModel.js';
import {
  DEFAULT_STALE_TIME_MS,
  SHORT_STALE_TIME_MS,
  STATIC_STALE_TIME_MS,
  createSessionQueryCache,
} from '../../../utils/sessionQueryCache.js';

export { DEFAULT_STALE_TIME_MS, SHORT_STALE_TIME_MS, STATIC_STALE_TIME_MS };

export function notifyWarehouseChanged(prefixes = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('warehouse:changed', { detail: { prefixes } }));
}

function matchesPrefix(key, prefixes) {
  if (!key) return false;
  if (prefixes == null || prefixes === '*') return true;
  const list = (Array.isArray(prefixes) ? prefixes : [prefixes]).filter(Boolean);
  return list.some((prefix) => key === prefix || key.startsWith(prefix));
}

const Session = createContext(null);
export function Phase2Provider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const warehouse = warehouseOf(user);
  const key = `${isAuthenticated}:${user?.id ?? ''}:${warehouse.id ?? ''}`;
  // Remount on identity/scope changes so even a late non-cancelable response cannot leak state.
  return (
    <ScopedSession key={key} user={isAuthenticated ? user : null} warehouse={warehouse}>
      {children}
    </ScopedSession>
  );
}
function ScopedSession({ user, warehouse, children }) {
  const controller = useMemo(() => new AbortController(), []);
  const cache = useMemo(() => createSessionQueryCache(), []);
  const mounted = useRef(false);
  const [identity, setIdentity] = useState(null);
  useEffect(() => {
    mounted.current = true;
    const abort = () => {
      controller.abort();
      cache.clear();
      setIdentity(null);
    };
    const onWarehouseChanged = (event) => {
      cache.invalidate(event?.detail?.prefixes ?? null);
    };
    window.addEventListener('auth:expired', abort);
    window.addEventListener('auth:logout', abort);
    window.addEventListener('warehouse:changed', onWarehouseChanged);
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) abort();
      });
      window.removeEventListener('auth:expired', abort);
      window.removeEventListener('auth:logout', abort);
      window.removeEventListener('warehouse:changed', onWarehouseChanged);
    };
  }, [controller, cache]);
  const scope = useMemo(
    () => ({
      userId: user?.accountId || user?.id,
      warehouseId: user?.warehouseId || warehouse.id || (isFixtureMode ? 'warehouse-a' : null),
    }),
    [user, warehouse.id],
  );
  const value = useMemo(
    () => ({
      scope,
      user,
      identity,
      setIdentity,
      signal: controller.signal,
      cache,
      warehouse: {
        ...warehouse,
        name: warehouse.name || (isFixtureMode ? 'Điểm kí gửi A · dữ liệu thử' : 'Chưa có thông tin điểm kí gửi'),
      },
    }),
    [scope, user, identity, controller, cache, warehouse.id, warehouse.name],
  );
  return <Session.Provider value={value}>{children}</Session.Provider>;
}
export function usePhase2() {
  return useContext(Session);
}
export function useModeratorCache() {
  return useContext(Session)?.cache || null;
}

export function useResource(
  loader,
  dependencies = [],
  {
    enabled = true,
    poll = false,
    done = () => false,
    refreshInterval = 0,
    cacheKey = null,
    staleTime = DEFAULT_STALE_TIME_MS,
    invalidatePrefixes = null,
  } = {},
) {
  const session = usePhase2();
  const sessionCache = session?.cache || null;
  const sessionScope = session?.scope;
  const sessionSignal = session?.signal;
  const [state, setState] = useState(() => {
    const cached = enabled && cacheKey ? sessionCache?.read(cacheKey) : null;
    return {
      data: cached ? cached.data : null,
      loading: false,
      isFetching: false,
      error: null,
    };
  });
  const [version, setVersion] = useState(0);
  const forceReloadRef = useRef(false);
  const [pollExpired, setPollExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const doneRef = useRef(done);
  doneRef.current = done;
  const epoch = useRef(0);
  const mutationLock = useRef(false);
  const mutations = useRef(new Set());
  useEffect(
    () => () => {
      mutations.current.forEach((controller) => controller.abort());
    },
    [],
  );
  useEffect(() => {
    setActionError(null);
    return () => {
      mutations.current.forEach((controller) => controller.abort());
    };
  }, dependencies);
  const setData = useCallback(
    (updater) => {
      setState((previous) => {
        const nextData = typeof updater === 'function' ? updater(previous.data) : updater;
        if (cacheKey && sessionCache) {
          sessionCache.write(cacheKey, nextData);
        }
        return { ...previous, data: nextData };
      });
    },
    [cacheKey, sessionCache],
  );
  const refresh = useCallback(() => {
    forceReloadRef.current = true;
    if (cacheKey && sessionCache) {
      sessionCache.invalidate(cacheKey);
    }
    setState({ data: null, loading: true, isFetching: true, error: null });
    setVersion((value) => value + 1);
  }, [cacheKey, sessionCache]);
  const silentRefresh = useCallback(async () => {
    if (!enabled || sessionSignal?.aborted) return;
    if (cacheKey && sessionCache) {
      sessionCache.invalidate(cacheKey);
    }
    const current = epoch.current;
    setState((previous) => ({ ...previous, isFetching: true }));
    try {
      const data = await loaderRef.current({ signal: sessionSignal, scope: sessionScope });
      if (sessionSignal?.aborted || current !== epoch.current) return;
      if (cacheKey && sessionCache) {
        sessionCache.write(cacheKey, data);
      }
      setState({ data, loading: false, isFetching: false, error: null });
    } catch {
      // Silent background sync keeps existing UI data intact on transient failure
      if (!sessionSignal?.aborted && current === epoch.current) {
        setState((previous) => ({ ...previous, isFetching: false }));
      }
    }
  }, [cacheKey, enabled, sessionCache, sessionScope, sessionSignal]);
  useEffect(() => {
    const onWarehouseChanged = (event) => {
      const prefixes = event?.detail?.prefixes;
      if (prefixes != null && prefixes !== '*') {
        if (!cacheKey || !matchesPrefix(cacheKey, prefixes)) {
          return;
        }
      }
      refresh();
    };
    window.addEventListener('warehouse:changed', onWarehouseChanged);
    return () => window.removeEventListener('warehouse:changed', onWarehouseChanged);
  }, [cacheKey, refresh]);
  useEffect(() => {
    if (!enabled || sessionSignal?.aborted) {
      setState({ data: null, loading: false, isFetching: false, error: null });
      return;
    }
    const isForced = forceReloadRef.current;
    forceReloadRef.current = false;
    const cachedEntry = cacheKey && sessionCache ? sessionCache.read(cacheKey) : null;
    const clearOnSessionAbort = () => {
      setState({ data: null, loading: false, isFetching: false, error: null });
    };

    // Case A: Fresh cache hit — render immediately without hitting the network.
    if (
      !isForced &&
      !poll &&
      !refreshInterval &&
      cachedEntry &&
      sessionCache.isFresh(cachedEntry, staleTime)
    ) {
      setState({ data: cachedEntry.data, loading: false, isFetching: false, error: null });
      sessionSignal?.addEventListener('abort', clearOnSessionAbort);
      return () => {
        sessionSignal?.removeEventListener('abort', clearOnSessionAbort);
      };
    }

    const isBackground = !isForced && cachedEntry != null;
    const controller = new AbortController();
    let timer,
      failures = 0,
      terminal = false,
      complete = false,
      inFlight = false;
    const current = ++epoch.current;
    const started = Date.now();
    const onSessionAbort = () => {
      controller.abort();
      clearTimeout(timer);
      clearOnSessionAbort();
    };
    sessionSignal?.addEventListener('abort', onSessionAbort);
    setPollExpired(false);
    if (isBackground) {
      // Case B: Stale cache hit (stale-while-revalidate) — show cached data immediately, refetch silently.
      setState({ data: cachedEntry.data, loading: false, isFetching: true, error: null });
    } else {
      // Case C: Cache miss or forced refresh.
      setState({ data: null, loading: true, isFetching: true, error: null });
    }
    const load = async (background = false) => {
      clearTimeout(timer);
      if (controller.signal.aborted || inFlight) return;
      if ((poll || refreshInterval) && document.visibilityState === 'hidden') return;
      if (poll && !refreshInterval && Date.now() - started >= 600000) {
        setPollExpired(true);
        return;
      }
      inFlight = true;
      try {
        const data = await loaderRef.current({ signal: controller.signal, scope: sessionScope });
        if (controller.signal.aborted || current !== epoch.current) return;
        failures = 0;
        complete = doneRef.current(data);
        terminal = false;
        if (cacheKey && sessionCache) {
          sessionCache.write(cacheKey, data);
        }
        setState({ data, loading: false, isFetching: false, error: null });
      } catch (error) {
        if (controller.signal.aborted || current !== epoch.current) return;
        failures++;
        const normalized = normalizeError(error);
        terminal =
          [401, 403, 404].includes(normalized.status) ||
          ['CONTRACT_BLOCKED', 'OPERATION_UNSUPPORTED'].includes(normalized.code);
        if ([401, 403, 404].includes(normalized.status)) {
          if (cacheKey && sessionCache) {
            sessionCache.evict(cacheKey);
          }
          setState({ data: null, loading: false, isFetching: false, error: normalized });
        } else if (background) {
          // Keep existing cached data visible on transient background refetch error.
          setState((previous) => ({
            ...previous,
            loading: false,
            isFetching: false,
          }));
        } else {
          setState((previous) => ({
            data: previous.data,
            loading: false,
            isFetching: false,
            error: normalized,
          }));
        }
      } finally {
        inFlight = false;
      }
      if (
        (refreshInterval || poll) &&
        !terminal &&
        (refreshInterval || !complete) &&
        !controller.signal.aborted &&
        document.visibilityState !== 'hidden'
      ) {
        if (!refreshInterval && Date.now() - started >= 600000) {
          setPollExpired(true);
          return;
        }
        timer = setTimeout(() => load(isBackground), refreshInterval && (!poll || complete)
          ? refreshInterval : Math.min(30000, 5000 * 2 ** failures));
      }
    };
    const hasAutoRefresh = Boolean(poll || refreshInterval > 0);
    const visibility = () => {
      clearTimeout(timer);
      if (
        document.visibilityState !== 'hidden' &&
        !terminal &&
        (refreshInterval > 0 || (poll && !complete))
      ) {
        if (poll && !refreshInterval && Date.now() - started >= 600000) setPollExpired(true);
        else load(isBackground);
      }
    };
    if (hasAutoRefresh && document.visibilityState === 'hidden') {
      if (isBackground) {
        setState({ data: cachedEntry.data, loading: false, isFetching: false, error: null });
      } else {
        setState({ data: null, loading: false, isFetching: false, error: null });
      }
    } else {
      load(isBackground);
    }
    if (hasAutoRefresh) {
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      controller.abort();
      clearTimeout(timer);
      sessionSignal?.removeEventListener('abort', onSessionAbort);
      if (hasAutoRefresh) {
        document.removeEventListener('visibilitychange', visibility);
      }
    };
    // Callers supply stable resource identifiers, never the inline loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionScope, sessionSignal, sessionCache, enabled, poll, refreshInterval, cacheKey, staleTime, version, ...dependencies]);

  const mutate = async (
    action,
    { onSuccess, onUncertain, onError, skipRefresh = false, invalidatePrefixes: callPrefixes = null } = {},
  ) => {
    if (mutationLock.current || sessionSignal?.aborted) return false;
    const controller = new AbortController();
    mutations.current.add(controller);
    const abort = () => controller.abort();
    sessionSignal?.addEventListener('abort', abort);
    mutationLock.current = true;
    setBusy(true);
    setState((previous) => ({ ...previous, error: null }));
    setActionError(null);
    try {
      const result = await action({ scope: sessionScope, signal: controller.signal });
      if (controller.signal.aborted) return false;
      if (sessionCache) {
        if (cacheKey) sessionCache.invalidate(cacheKey);
        if (invalidatePrefixes) sessionCache.invalidate(invalidatePrefixes);
        if (callPrefixes) sessionCache.invalidate(callPrefixes);
      }
      await onSuccess?.(result);
      if (!skipRefresh) {
        refresh();
      }
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      const normalized = normalizeError(error);
      if ([401, 403, 404].includes(normalized.status)) {
        if (cacheKey && sessionCache) {
          sessionCache.evict(cacheKey);
        }
        setState({ data: null, loading: false, isFetching: false, error: null });
      }
      if (normalized.status === 409) refresh();
      if (
        (!normalized.status || normalized.status >= 500) &&
        !['CONTRACT_BLOCKED', 'OPERATION_UNSUPPORTED'].includes(normalized.code)
      )
        onUncertain?.();
      await onError?.(normalized);
      // Keep action errors separate from refresh to avoid erasing a conflict message.
      setActionError(normalized);
      return false;
    } finally {
      mutationLock.current = false;
      mutations.current.delete(controller);
      sessionSignal?.removeEventListener('abort', abort);
      if (!sessionSignal?.aborted) setBusy(false);
    }
  };
  const [actionError, setActionError] = useState(null);
  return {
    ...state,
    error: actionError || state.error,
    actionError,
    clearActionError: () => setActionError(null),
    setData,
    refresh,
    silentRefresh,
    mutate,
    busy,
    pollExpired,
  };
}
