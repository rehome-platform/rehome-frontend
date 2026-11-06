import React, { useEffect, useId, useRef } from 'react';

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
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
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
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#717971] hover:text-[#191C19] hover:bg-[#EBF1E8] transition-colors"
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
}
