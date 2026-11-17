import React from 'react';
import { TIER_BADGE_STYLES } from './membershipConstants.js';

/**
 * Badge màu riêng cho từng hạng thành viên (Thường / Bạc / Vàng / Kim cương)
 * để dễ phân biệt bằng mắt thay vì chỉ hiển thị chữ đen trơn.
 */
export default function TierBadge({ tier, label }) {
  const style = TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.FREE;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${style.classes}`}
    >
      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
      <span>{label}</span>
    </span>
  );
}
