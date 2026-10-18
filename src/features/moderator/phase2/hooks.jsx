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
import { isFixtureMode } from './contract.js';
import { normalizeError, warehouseOf } from './model.js';

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
  const mounted = useRef(false);
  const [identity, setIdentity] = useState(null);
  useEffect(() => {
    mounted.current = true;
    const abort = () => {
      controller.abort();
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
      warehouseId: warehouse.id || (isFixtureMode ? 'warehouse-a' : null),
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
      warehouse: {
        ...warehouse,
        name: warehouse.name || (isFixtureMode ? 'Kho A · dữ liệu thử' : 'Chưa có thông tin kho'),
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
  { enabled = true, poll = false, done = () => false } = {},
) {
  const session = usePhase2();
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const [version, setVersion] = useState(0);
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
  const refresh = useCallback(() => {
    setState({ data: null, loading: true, error: null });
    setVersion((value) => value + 1);
  }, []);
  useEffect(() => {
    if (!enabled || session.signal.aborted) {
      setState({ data: null, loading: false, error: null });
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
      inFlight = true;
      try {
        const data = await loaderRef.current({ signal: controller.signal, scope: session.scope });
        if (controller.signal.aborted || current !== epoch.current) return;
        failures = 0;
        complete = doneRef.current(data);
        terminal = false;
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted || current !== epoch.current) return;
        failures++;
        const normalized = normalizeError(error);
        terminal =
          [401, 403, 404].includes(normalized.status) || normalized.code === 'CONTRACT_BLOCKED';
        setState((previous) => ({
          data: [401, 403, 404].includes(normalized.status) ? null : previous.data,
          loading: false,
          error: normalized,
        }));
      } finally {
        inFlight = false;
      }
      if (
        poll &&
        !terminal &&
        !complete &&
        !controller.signal.aborted &&
        document.visibilityState !== 'hidden'
      ) {
        if (Date.now() - started >= 600000) {
          setPollExpired(true);
          return;
        }
        timer = setTimeout(load, Math.min(30000, 5000 * 2 ** failures));
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'hidden' && !terminal) {
        if (poll && Date.now() - started >= 600000) setPollExpired(true);
        else load();
      }
    };
    load();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      abort();
      session.signal.removeEventListener('abort', abort);
      document.removeEventListener('visibilitychange', visibility);
    };
    // Callers supply stable resource identifiers, never the inline loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.scope, session.signal, enabled, poll, version, ...dependencies]);

  const mutate = async (action, { onSuccess, onUncertain } = {}) => {
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
      refresh();
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      const normalized = normalizeError(error);
      if ([401, 403, 404].includes(normalized.status))
        setState({ data: null, loading: false, error: null });
      if (normalized.status === 409) refresh();
      if (
        (!normalized.status || normalized.status >= 500) &&
        normalized.code !== 'CONTRACT_BLOCKED'
      )
        onUncertain?.();
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
    refresh,
    mutate,
    busy,
    pollExpired,
  };
}
