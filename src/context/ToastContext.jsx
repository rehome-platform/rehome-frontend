import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', message = '', duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast = { id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const toast = useMemo(() => {
    const fn = (message, duration) => showToast({ type: 'info', message, duration });
    fn.success = (message, duration) => showToast({ type: 'success', message, duration });
    fn.error = (message, duration) => showToast({ type: 'error', message, duration });
    fn.info = (message, duration) => showToast({ type: 'info', message, duration });
    fn.warn = (message, duration) => showToast({ type: 'warn', message, duration });
    fn.dismiss = dismissToast;
    return fn;
  }, [showToast, dismissToast]);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      toast,
    }),
    [toasts, showToast, dismissToast, toast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a safe fallback if used outside ToastProvider
    const fallback = (msg) => console.log('[Toast]', msg);
    fallback.success = (msg) => console.log('[Toast:success]', msg);
    fallback.error = (msg) => console.error('[Toast:error]', msg);
    fallback.info = (msg) => console.info('[Toast:info]', msg);
    fallback.warn = (msg) => console.warn('[Toast:warn]', msg);
    fallback.dismiss = () => {};
    return fallback;
  }
  return context.toast;
}

export default ToastContext;

