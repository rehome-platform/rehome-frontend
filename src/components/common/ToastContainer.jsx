import React, { useContext } from 'react';
import ToastContext from '../../context/ToastContext.jsx';
import ToastItem from './ToastItem.jsx';

export default function ToastContainer() {
  const context = useContext(ToastContext);
  const toasts = context?.toasts || [];
  const dismissToast = context?.dismissToast;

  if (!toasts.length) return null;

  return (
    <div
      data-testid="rehome-toast-container"
      aria-live="polite"
      aria-label="Thông báo hệ thống"
      className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none items-end"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

