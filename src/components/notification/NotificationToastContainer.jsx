import React from 'react';
import { useNotification } from '../../context/NotificationContext.jsx';
import NotificationToastItem from './NotificationToastItem.jsx';

export default function NotificationToastContainer({ userRole }) {
  const notificationCtx = useNotification();
  const activeToasts = notificationCtx?.activeToasts || [];
  const dismissToast = notificationCtx?.dismissToast;

  return (
    <div
      data-testid="notification-toast-container"
      role="region"
      aria-live="polite"
      aria-label="Thông báo nổi"
      className="fixed bottom-6 right-4 sm:right-6 z-[60] flex flex-col gap-3 pointer-events-none w-[calc(100vw-2rem)] sm:w-auto max-w-sm sm:max-w-md"
    >
      {activeToasts.map((toast) => (
        <NotificationToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          userRole={userRole}
        />
      ))}
    </div>
  );
}
