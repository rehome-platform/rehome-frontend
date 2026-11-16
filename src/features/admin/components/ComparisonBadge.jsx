import React from 'react';

/**
 * Nhãn nhỏ "▲ 12.5% so với tháng trước" cạnh một con số, dùng chung cho các thẻ/biểu đồ có so sánh với
 * kỳ trước (xem getPreviousPeriodRange trong adminDateUtils.js).
 *
 * - `label` null (period = "Toàn thời gian", không có kỳ trước) -> không hiện gì.
 * - `loading` true -> hiện khung chờ mờ, không chặn hiển thị con số chính.
 * - `previous` bằng 0 mà `current` > 0 -> hiện "Mới" thay vì chia cho 0.
 * - Cả hai cùng bằng 0, hoặc `previous`/`current` chưa có (null) -> không hiện gì.
 */
export default function ComparisonBadge({ current, previous, loading, label, className = '' }) {
  if (!label) return null;

  if (loading) {
    return (
      <span
        className={`inline-block h-4 w-24 rounded bg-[#E2E8E0] animate-pulse align-middle ${className}`}
        aria-label="Đang tải số liệu để so sánh"
      />
    );
  }

  if (previous == null || current == null) return null;
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold text-[#006B2C] ${className}`}>
        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
        Mới so với {label}
      </span>
    );
  }

  const percent = ((current - previous) / Math.abs(previous)) * 100;
  const isFlat = Math.abs(percent) < 0.05;
  const isUp = percent > 0;
  const colorClass = isFlat ? 'text-[#717971]' : isUp ? 'text-[#006B2C]' : 'text-[#DC2626]';
  const icon = isFlat ? 'trending_flat' : isUp ? 'trending_up' : 'trending_down';
  // Né "-0.0%" (số 0 âm) khi đi ngang; toFixed(1) đã tự có dấu "-" cho số âm nên chỉ cần thêm "+" khi tăng
  const displayPercent = isFlat ? '0.0' : percent.toFixed(1);
  const sign = !isFlat && isUp ? '+' : '';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${colorClass} ${className}`}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {sign}
      {displayPercent}% so với {label}
    </span>
  );
}
