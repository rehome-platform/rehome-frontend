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
  const cache = useMemo(() => new Map(), []);
  const mounted = useRef(false);
  const [identity, setIdentity] = useState(null);
  useEffect(() => {
    mounted.current = true;
    const abort = () => {
      controller.abort();
      cache.clear();
      setIdentity(null);
    };
    window.addEventListener('auth:expired', abort);
    window.addEventListener('auth:logout', abort);
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) abort();
      });
      window.removeEventListener('auth:expired', abort);
      window.removeEventListener('auth:logout', abort);
    };
  }, [controller]);
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
    [scope, user, identity, controller, warehouse.id, warehouse.name],
  );
  return <Session.Provider value={value}>{children}</Session.Provider>;
}
export function usePhase2() {
  return useContext(Session);
}

export function useResource(
  loader,
  dependencies = [],
  { enabled = true, poll = false, done = () => false, refreshInterval = 0, cacheKey = null } = {},
) {
  const session = usePhase2();
  const [state, setState] = useState(() => {
    const cached = cacheKey && session?.cache?.has(cacheKey) ? session.cache.get(cacheKey) : null;
    return { data: cached, loading: false, error: null };
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
        if (cacheKey && session?.cache) {
          session.cache.set(cacheKey, nextData);
        }
        return { ...previous, data: nextData };
      });
    },
    [cacheKey, session],
  );
  const refresh = useCallback(() => {
    forceReloadRef.current = true;
    if (cacheKey && session?.cache) {
      session.cache.delete(cacheKey);
    }
    setState({ data: null, loading: true, error: null });
    setVersion((value) => value + 1);
  }, [cacheKey, session]);
  const silentRefresh = useCallback(async () => {
    if (!enabled || session.signal.aborted) return;
    if (cacheKey && session?.cache) {
      session.cache.delete(cacheKey);
    }
    const current = epoch.current;
    try {
      const data = await loaderRef.current({ signal: session.signal, scope: session.scope });
      if (session.signal.aborted || current !== epoch.current) return;
      if (cacheKey && session?.cache) {
        session.cache.set(cacheKey, data);
      }
      setState({ data, loading: false, error: null });
    } catch {
      // Silent background sync keeps existing UI data intact on transient failure
    }
  }, [cacheKey, enabled, session]);
  useEffect(() => {
    window.addEventListener('warehouse:changed', refresh);
    return () => window.removeEventListener('warehouse:changed', refresh);
  }, [refresh]);
  useEffect(() => {
    if (!enabled || session.signal.aborted) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const isForced = forceReloadRef.current;
    forceReloadRef.current = false;
    if (!isForced && !poll && !refreshInterval && cacheKey && session?.cache?.has(cacheKey)) {
      setState({ data: session.cache.get(cacheKey), loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    let timer,
      failures = 0,
      terminal = false,
      complete = false,
      inFlight = false;
    const current = ++epoch.current;
    const started = Date.now();
    const abort = () => {
      controller.abort();
      clearTimeout(timer);
      setState({ data: null, loading: false, error: null });
    };
    session.signal.addEventListener('abort', abort);
    setPollExpired(false);
    setState({ data: null, loading: true, error: null });
    const load = async () => {
      clearTimeout(timer);
      if (controller.signal.aborted || inFlight) return;
      if ((poll || refreshInterval) && document.visibilityState === 'hidden') return;
      if (poll && !refreshInterval && Date.now() - started >= 600000) {
        setPollExpired(true);
        return;
      }
      inFlight = true;
      try {
        const data = await loaderRef.current({ signal: controller.signal, scope: session.scope });
        if (controller.signal.aborted || current !== epoch.current) return;
        failures = 0;
        complete = doneRef.current(data);
        terminal = false;
        if (cacheKey && session?.cache) {
          session.cache.set(cacheKey, data);
        }
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted || current !== epoch.current) return;
        failures++;
        const normalized = normalizeError(error);
        terminal =
          [401, 403, 404].includes(normalized.status) ||
          ['CONTRACT_BLOCKED', 'OPERATION_UNSUPPORTED'].includes(normalized.code);
        setState((previous) => ({
          data: [401, 403, 404].includes(normalized.status) ? null : previous.data,
          loading: false,
          error: normalized,
        }));
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
        timer = setTimeout(load, refreshInterval && (!poll || complete)
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
        else load();
      }
    };
    if (hasAutoRefresh && document.visibilityState === 'hidden') {
      setState({ data: null, loading: false, error: null });
    } else load();
    if (hasAutoRefresh) {
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      abort();
      session.signal.removeEventListener('abort', abort);
      if (hasAutoRefresh) {
        document.removeEventListener('visibilitychange', visibility);
      }
    };
    // Callers supply stable resource identifiers, never the inline loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.scope, session.signal, enabled, poll, refreshInterval, version, ...dependencies]);

  const mutate = async (action, { onSuccess, onUncertain, onError, skipRefresh = false } = {}) => {
    if (mutationLock.current || session.signal.aborted) return false;
    const controller = new AbortController();
    mutations.current.add(controller);
    const abort = () => controller.abort();
    session.signal.addEventListener('abort', abort);
    mutationLock.current = true;
    setBusy(true);
    setState((previous) => ({ ...previous, error: null }));
    setActionError(null);
    try {
      const result = await action({ scope: session.scope, signal: controller.signal });
      if (controller.signal.aborted) return false;
      await onSuccess?.(result);
      if (!skipRefresh) {
        refresh();
      }
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      const normalized = normalizeError(error);
      if ([401, 403, 404].includes(normalized.status))
        setState({ data: null, loading: false, error: null });
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
      session.signal.removeEventListener('abort', abort);
      if (!session.signal.aborted) setBusy(false);
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
