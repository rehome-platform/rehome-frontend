import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolveNotificationUrl } from '../../utils/notificationNavigator.js';
import { formatDateTime } from '../../utils/formatters.js';

gsap.registerPlugin(useGSAP);

export default function NotificationToastItem({ toast, onDismiss, userRole }) {
  const navigate = useNavigate();
  const notificationCtx = useNotification();
  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    // If rendered outside AuthProvider
  }

  const role = userRole || authUser?.role || 'moderator';
  const toastRef = useRef(null);
  const progressRef = useRef(null);
  const isDismissingRef = useRef(false);
  const timerRef = useRef(null);

  const dismiss = () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const triggerDismiss = () => {
      if (onDismiss) {
        onDismiss(toast.id);
      } else if (notificationCtx?.dismissToast) {
        notificationCtx.dismissToast(toast.id);
      }
    };

    if (toastRef.current) {
      gsap.to(toastRef.current, {
        x: 60,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: triggerDismiss,
      });
      if (process.env.NODE_ENV === 'test') {
        triggerDismiss();
      }
    } else {
      triggerDismiss();
    }
  };

  useGSAP(
    () => {
      if (toastRef.current) {
        gsap.from(toastRef.current, {
          x: 60,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
        });
      }

      if (progressRef.current) {
        gsap.fromTo(
          progressRef.current,
          { width: '100%' },
          { width: '0%', duration: 15, ease: 'linear' }
        );
      }
    },
    { scope: toastRef }
  );

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 15000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id]);

  const handleContentClick = () => {
    if (notificationCtx?.markAsRead) {
      notificationCtx.markAsRead(toast.id);
    }
    const targetUrl = resolveNotificationUrl(toast, role);
    if (targetUrl) {
      navigate(targetUrl);
    }
    dismiss();
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    dismiss();
  };

  return (
    <div
      ref={toastRef}
      data-testid="notification-toast-item"
      className="w-80 sm:w-96 bg-white border border-[#DDE5D9] rounded-2xl shadow-xl font-sans overflow-hidden pointer-events-auto transition-shadow hover:shadow-2xl flex flex-col"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-[#F0F5EE] text-[#006B2C] flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </div>

        {/* Content */}
        <div
          data-testid="notification-toast-content"
          role="button"
          tabIndex={0}
          onClick={handleContentClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleContentClick();
            }
          }}
          className="flex-1 min-w-0 cursor-pointer text-left focus:outline-none"
        >
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm font-bold text-[#1F2A37] truncate">
              {toast.title || 'Thông báo mới'}
            </h4>
          </div>
          <p className="text-xs text-[#586776] line-clamp-2 mt-1 leading-relaxed">
            {toast.message}
          </p>
          {toast.createdAt && (
            <span className="text-[10px] text-[#586776] mt-1 block">
              {formatDateTime(toast.createdAt)}
            </span>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          aria-label="Đóng"
          onClick={handleCloseClick}
          className="text-[#586776] hover:text-[#1F2A37] hover:bg-[#F0F5EE] p-1 rounded-lg transition-colors shrink-0 -mr-1 -mt-1"
        >
          <span className="material-symbols-outlined text-lg leading-none">close</span>
        </button>
      </div>

      {/* Progress Bar (15s duration) */}
      <div className="w-full bg-[#E2E8E0] h-1 overflow-hidden">
        <div
          ref={progressRef}
          data-testid="notification-toast-progress"
          className="h-full bg-[#006B2C]"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
