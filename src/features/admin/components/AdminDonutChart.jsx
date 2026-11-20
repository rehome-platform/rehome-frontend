import React from 'react';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Khe hở giữa các lát để dễ phân biệt khi có từ hai lát trở lên
const SEGMENT_GAP = 1.6;

/**
 * Biểu đồ tròn (donut) dùng chung cho dashboard Admin. Các lát tự vẽ dần khi biểu đồ xuất hiện
 * (hiệu ứng `chart-donut-draw` trong global.css).
 *
 * segments: [{ key, label, value, color }] - lát có value <= 0 bị bỏ qua.
 * Kích thước do `className` quyết định (ví dụ "w-56 h-56"); số và nhãn ở giữa do centerValue/centerLabel.
 */
export default function AdminDonutChart({
  segments = [],
  centerValue,
  centerLabel,
  className = 'w-48 h-48',
  ariaLabel,
}) {
  const visible = segments.filter((s) => Number(s.value) > 0);
  const total = visible.reduce((sum, s) => sum + Number(s.value), 0);
  const gap = visible.length > 1 ? SEGMENT_GAP : 0;

  let cumulative = 0;
  const arcs = visible.map((seg, idx) => {
    const pct = Number(seg.value) / total;
    const dash = Math.max(pct * CIRCUMFERENCE - gap, 0.01);
    const offset = -(cumulative * CIRCUMFERENCE);
    cumulative += pct;
    return { ...seg, idx, dash, offset };
  });

  return (
    <div className={`relative shrink-0 ${className}`}>
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 100 100"
        role="img"
        aria-label={ariaLabel || 'Biểu đồ tròn'}
      >
        <circle cx="50" cy="50" r={RADIUS} fill="transparent" stroke="#E9F0E5" strokeWidth="14" />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            stroke={arc.color}
            strokeWidth="14"
            strokeDasharray={`${arc.dash.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
            strokeDashoffset={arc.offset.toFixed(2)}
            className="chart-donut-seg"
            style={{ '--donut-c': CIRCUMFERENCE.toFixed(2), '--i': arc.idx }}
          >
            <title>{`${arc.label}: ${arc.value}`}</title>
          </circle>
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-3xl sm:text-4xl font-black text-[#1F2A37] font-heading leading-none">
          {centerValue}
        </span>
        {centerLabel && (
          <span className="mt-1.5 text-[11px] sm:text-xs text-[#5B6776] font-medium leading-tight">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}
