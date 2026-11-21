import React, { Suspense, lazy, useContext } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.jsx';
import ToastContext, { ToastProvider } from './context/ToastContext.jsx';
import AppRouter from './routes/AppRouter.jsx';

const LazyNotificationToastContainer = lazy(() =>
  import('./components/notification/NotificationToastContainer.jsx')
);
const LazyToastContainer = lazy(() => import('./components/common/ToastContainer.jsx'));
const LazyPhase2Provider = lazy(() =>
  import('./features/moderator/hooks/warehouseHooks.jsx').then((m) => ({
    default: m.Phase2Provider,
  }))
);

function AppNotificationToasts() {
  const notificationCtx = useNotification();
  const activeToasts = notificationCtx?.activeToasts || [];

  if (activeToasts.length === 0) {
    return (
      <div
        data-testid="notification-toast-container"
        role="region"
        aria-live="polite"
        aria-label="Thông báo nổi"
        className="fixed bottom-6 right-4 sm:right-6 z-[60] flex flex-col gap-3 pointer-events-none w-[calc(100vw-2rem)] sm:w-auto max-w-sm sm:max-w-md"
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <LazyNotificationToastContainer />
    </Suspense>
  );
}

function AppToasts() {
  const toastCtx = useContext(ToastContext);
  const toasts = toastCtx?.toasts || [];

  if (toasts.length === 0) return null;

  return (
    <Suspense fallback={null}>
      <LazyToastContainer />
    </Suspense>
  );
}

function ConditionalPhase2Provider({ children }) {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/moderator')) {
    return children;
  }
  return (
    <Suspense fallback={null}>
      <LazyPhase2Provider>{children}</LazyPhase2Provider>
    </Suspense>
  );
}

/**
 * Root Component - Configures Context Providers and Router
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <ToastProvider>
              <AppNotificationToasts />
              <AppToasts />
              <ConditionalPhase2Provider>
                <AppRouter />
              </ConditionalPhase2Provider>
            </ToastProvider>
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
