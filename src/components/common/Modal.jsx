import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  maxWidth,
  showCloseButton = true,
}) {
  const panel = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useGSAP(
    () => {
      if (isOpen && panel.current && process.env.NODE_ENV !== 'test') {
        const prefersReduced =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced) {
          gsap.from(panel.current, {
            scale: 0.95,
            opacity: 0,
            duration: 0.25,
            ease: 'power2.out',
          });
        }
      }
    },
    { dependencies: [isOpen], scope: panel }
  );

  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  const effectiveMaxWidth = maxWidth || sizeMap[size] || 'max-w-lg';

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const select = () => [
      ...(panel.current?.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) || []),
    ];
    (select()[0] || panel.current)?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeRef.current?.();
      }
      if (e.key === 'Tab') {
        const focusable = select(),
          first = focusable[0],
          last = focusable.at(-1);
        if (!first) {
          e.preventDefault();
          panel.current?.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 !mt-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        ref={panel}
        tabIndex={-1}
        className={`w-full ${effectiveMaxWidth} bg-white rounded-2xl shadow-2xl border border-neutral overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral bg-[#FAFBF9]">
          <h3 id={titleId} className="text-base sm:text-lg font-bold text-[#191C19]">
            {title}
          </h3>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#5B6776] hover:text-[#191C19] hover:bg-[#EBF1E8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40"
              aria-label="Đóng"
            >
              ✕
            </button>
          )}
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto text-sm text-[#414942]">{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
