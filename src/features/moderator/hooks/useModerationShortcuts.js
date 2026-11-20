import { useEffect } from 'react';

function isTypingElement(target) {
  if (!target || typeof target !== 'object') return false;
  const tag = String(target.tagName || '').toUpperCase();
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(target.isContentEditable)
  );
}

/**
 * Hook phím tắt duyệt nhanh cho Moderator (A = Duyệt, R = Từ chối, Escape = Quay lại/Đóng).
 * Tự động bỏ qua khi đang gõ trong input/textarea/select hoặc giữ Ctrl/Alt/Meta.
 */
export function useModerationShortcuts({
  enabled = true,
  onApprove,
  onReject,
  onEscape,
}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape(event);
        return;
      }

      if (isTypingElement(event.target)) return;

      const key = String(event.key || '').toLowerCase();
      if (key === 'a' && onApprove) {
        event.preventDefault();
        onApprove(event);
      } else if (key === 'r' && onReject) {
        event.preventDefault();
        onReject(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onApprove, onReject, onEscape]);
}

export default useModerationShortcuts;
