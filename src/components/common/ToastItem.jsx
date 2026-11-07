import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function ToastItem({ toast, onDismiss }) {
  const itemRef = useRef(null);
  const barRef = useRef(null);
  const isDismissingRef = useRef(false);
  const timerRef = useRef(null);

  const duration = toast.duration || 4000;

  const triggerDismiss = () => {
    if (onDismiss) {
      onDismiss(toast.id);
    }
  };

  const dismiss = () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (itemRef.current && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      gsap.to(itemRef.current, {
        x: 60,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: triggerDismiss,
      });
    } else {
      triggerDismiss();
    }
  };

  useGSAP(
    () => {
      if (itemRef.current && process.env.NODE_ENV !== 'test') {
        gsap.from(itemRef.current, {
          x: 60,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
        });
      }

      if (barRef.current && process.env.NODE_ENV !== 'test') {
        gsap.fromTo(
          barRef.current,
          { width: '100%' },
          { width: '0%', duration: duration / 1000, ease: 'linear' }
        );
      }
    },
    { scope: itemRef }
  );

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, duration]);

  const typeConfig = {
    success: {
      color: '#006B2C',
      bgColor: '#E8F5E9',
      borderColor: '#A5D6A7',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0 text-[#006B2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
      badgeText: 'Thành công',
    },
    error: {
      color: '#D92D20',
      bgColor: '#FEE4E2',
      borderColor: '#FDA29B',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0 text-[#D92D20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      badgeText: 'Lỗi',
    },
    warn: {
      color: '#FEA619',
      bgColor: '#FEF0C7',
      borderColor: '#FEDF89',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0 text-[#FEA619]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      badgeText: 'Cảnh báo',
    },
    info: {
      color: '#006B2C',
      bgColor: '#E8F5E9',
      borderColor: '#A5D6A7',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0 text-[#006B2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badgeText: 'Thông báo',
    },
  };

  const currentConfig = typeConfig[toast.type] || typeConfig.info;

  return (
    <div
      ref={itemRef}
      role="alert"
      className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white border border-[#DDE5D9] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-start gap-3 w-full font-sans transition-shadow"
      style={{ minWidth: '320px', maxWidth: '420px' }}
    >
      <div className="mt-0.5">{currentConfig.icon}</div>
      <div className="flex-1 text-xs text-[#191C19] leading-relaxed pr-2">
        <p className="font-semibold">{toast.message}</p>
      </div>
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={dismiss}
        className="text-[#717971] hover:text-[#191C19] text-sm p-1 font-bold leading-none cursor-pointer transition-colors"
      >
        ✕
      </button>

      {/* Thanh đếm lùi thời gian */}
      <div
        ref={barRef}
        className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
        style={{ color: currentConfig.color, width: '100%' }}
      />
    </div>
  );
}

