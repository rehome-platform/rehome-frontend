import React, { useId } from 'react';

/**
 * Tooltip nhẹ dùng chung cho các nút Icon / hành động nhanh (hover + keyboard focus).
 * Hỗ trợ hiển thị kèm phím tắt (shortcut) cho trang Moderator.
 */
export default function Tooltip({
  content,
  shortcut,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
  children,
}) {
  const tooltipId = useId();

  if (!content) return children;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <span className={`relative inline-flex group/tooltip ${className}`}>
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            'aria-describedby': children.props['aria-describedby']
              ? `${children.props['aria-describedby']} ${tooltipId}`
              : tooltipId,
          })
        : children}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute z-[70] whitespace-nowrap rounded-lg bg-[#1F2A37] px-2.5 py-1 text-[11px] font-medium text-white shadow-md opacity-0 invisible transition-opacity duration-150 group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible ${
          positionClasses[position] || positionClasses.top
        }`}
      >
        <span>{content}</span>
        {shortcut && (
          <kbd className="ml-1.5 inline-block rounded bg-white/15 px-1 py-0.5 font-mono text-[10px] font-bold text-white">
            {shortcut}
          </kbd>
        )}
      </span>
    </span>
  );
}
