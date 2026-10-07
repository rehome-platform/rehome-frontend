import React, { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full ${maxWidth} bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
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
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
