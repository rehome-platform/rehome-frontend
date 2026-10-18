import React, { useEffect, useId, useRef } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
}) {
  const panel = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
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
        className={`w-full ${maxWidth} bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 id={titleId} className="text-lg font-semibold text-on-surface">
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-outline hover:text-on-surface p-1 rounded-md transition-colors"
              aria-label="Đóng"
            >
              ✕
            </button>
          )}
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
