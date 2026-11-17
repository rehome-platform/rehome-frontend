import React from 'react';

const SIZES = {
  xs: 'w-3.5 h-3.5 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

/**
 * Vòng tròn loading dùng chung — thay cho icon "progress_activity" xoay hoặc chữ "Đang tải..." trần.
 */
export default function Spinner({ size = 'md', color = '#006B2C', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      style={{ borderColor: color, borderTopColor: 'transparent' }}
      className={`inline-block rounded-full animate-spin ${SIZES[size] || SIZES.md} ${className}`}
    />
  );
}
