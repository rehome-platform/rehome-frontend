import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi.js';
import {
  getVietnamToday,
  getDefaultGrowthRange,
  validateDateRange,
} from '../utils/adminDateUtils.js';

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
];

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'ORGANIZATION', label: 'Tổ chức' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMIN', label: 'Admin' },
];

function get12MonthRange(now = new Date()) {
  const to = getVietnamToday(now);
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - 11);
  return {
    from: start.toISOString().slice(0, 10),
    to,
  };
}

/**
 * Biểu đồ tăng trưởng đăng ký tài khoản theo ngày/tuần/tháng (GET /api/admin/accounts/growth).
 */
export default function AdminAccountGrowthChart({ footerNote }) {
  const initialRange = getDefaultGrowthRange(30);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [granularity, setGranularity] = useState('day');
  const [role, setRole] = useState('ALL');

  const [growthData, setGrowthData] = useState({
    granularity: 'day',
    from: initialRange.from,
    to: initialRange.to,
    total: 0,
    points: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const reqSeqRef = useRef(0);

  const fetchGrowth = useCallback(async (nextFrom, nextTo, nextGranularity, nextRole) => {
    const validationError = validateDateRange(nextFrom, nextTo);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const reqId = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAccountGrowth({
        from: nextFrom || undefined,
        to: nextTo || undefined,
        granularity: nextGranularity,
        role: nextRole === 'ALL' ? undefined : nextRole,
      });
      if (reqId === reqSeqRef.current && data) {
        setGrowthData({
          granularity: data.granularity || nextGranularity,
          from: data.from || nextFrom,
          to: data.to || nextTo,
          total: data.total ?? 0,
          points: Array.isArray(data.points) ? data.points : [],
        });
        setHoveredIdx(null);
      }
    } catch (err) {
      if (reqId === reqSeqRef.current) {
        console.error('Lỗi tải dữ liệu tăng trưởng tài khoản:', err);
        const code = err?.response?.data?.code;
        if (code === 'INVALID_DATE_RANGE') {
          setError('Khoảng thời gian vượt quá 366 kỳ dữ liệu. Vui lòng thu hẹp ngày hoặc chuyển sang chế độ Tuần hoặc Tháng.');
        } else {
          setError('Không thể tải biểu đồ tăng trưởng tài khoản.');
        }
      }
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchGrowth(from, to, granularity, role);
  }, [from, to, granularity, role, fetchGrowth]);

  const applyQuickDays = (days) => {
    const next = getDefaultGrowthRange(days);
    setFrom(next.from);
    setTo(next.to);
  };

  const apply12Months = () => {
    const next = get12MonthRange();
    setFrom(next.from);
    setTo(next.to);
    setGranularity('month');
  };

  const points = growthData.points || [];
  const maxCount = Math.max(1, ...points.map((p) => Number(p.count || 0)));
  const yTicks = [maxCount, Math.round(maxCount * 0.66), Math.round(maxCount * 0.33), 0];

  const chartLeft = 48;
  const chartRight = 568;
  const chartTop = 24;
  const chartBottom = 166;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const coords = points.map((pt, idx) => {
    const x =
      points.length <= 1
        ? chartLeft + chartWidth / 2
        : chartLeft + (idx / (points.length - 1)) * chartWidth;
    const y = chartBottom - (Number(pt.count || 0) / maxCount) * chartHeight;
    return { x, y, pt };
  });

  const linePath =
    coords.length > 0
      ? coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
      : '';
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${chartBottom} L ${coords[0].x.toFixed(1)} ${chartBottom} Z`
      : '';

  const activePoint = hoveredIdx !== null && coords[hoveredIdx] ? coords[hoveredIdx].pt : null;
  const labelIndices =
    points.length <= 5
      ? points.map((_, i) => i)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Tài khoản mới theo chu kỳ
          </h3>
          <p className="text-xs text-[#717971] mt-0.5">
            Ghi nhận <strong className="text-[#006B2C]">{growthData.total} tài khoản mới</strong> từ {growthData.from} đến {growthData.to}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] p-0.5">
            {GRANULARITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGranularity(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  granularity === opt.value
                    ? 'bg-[#006B2C] text-white'
                    : 'text-[#414942] hover:text-[#006B2C]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Lọc vai trò tăng trưởng"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[#DDE5D9] bg-white text-xs font-medium text-[#191C19] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bộ lọc khoảng ngày & chọn nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F0F4EE]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyQuickDays(7)}
            className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] bg-[#F6F9F4] hover:bg-[#E9F0E5] text-[11px] font-medium text-[#414942]"
          >
            7 ngày
          </button>
          <button
            type="button"
            onClick={() => applyQuickDays(30)}
            className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] bg-[#F6F9F4] hover:bg-[#E9F0E5] text-[11px] font-medium text-[#414942]"
          >
            30 ngày
          </button>
          <button
            type="button"
            onClick={() => applyQuickDays(90)}
            className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] bg-[#F6F9F4] hover:bg-[#E9F0E5] text-[11px] font-medium text-[#414942]"
          >
            90 ngày
          </button>
          <button
            type="button"
            onClick={apply12Months}
            className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] bg-[#F6F9F4] hover:bg-[#E9F0E5] text-[11px] font-medium text-[#414942]"
          >
            12 tháng
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-[11px] text-[#717971]">
            <span>Từ:</span>
            <input
              type="date"
              aria-label="Từ ngày tăng trưởng"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[#DDE5D9] text-xs text-[#191C19]"
            />
          </label>
          <label className="flex items-center gap-1 text-[11px] text-[#717971]">
            <span>Đến:</span>
            <input
              type="date"
              aria-label="Đến ngày tăng trưởng"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[#DDE5D9] text-xs text-[#191C19]"
            />
          </label>
        </div>
      </div>

      {/* Nội dung biểu đồ */}
      {error ? (
        <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2 my-auto">
          <p className="text-xs font-semibold text-[#B91C1C]">{error}</p>
          <button
            type="button"
            onClick={() => fetchGrowth(from, to, granularity, role)}
            className="px-3 py-1.5 rounded-lg bg-[#006B2C] text-white text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="h-56 flex items-center justify-center rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#717971]">
          Đang tải dữ liệu tăng trưởng tài khoản...
        </div>
      ) : points.length === 0 ? (
        <div className="h-56 flex items-center justify-center rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#717971]">
          Chưa có dữ liệu tăng trưởng trong khoảng thời gian đã chọn.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative w-full h-56 pt-1">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 195"
              aria-label="Biểu đồ tăng trưởng tài khoản"
            >
              <defs>
                <linearGradient id="greenGrowthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006B2C" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#006B2C" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {yTicks.map((tick, idx) => {
                const yVal = chartBottom - (tick / maxCount) * chartHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={chartLeft}
                      y1={yVal}
                      x2={chartRight}
                      y2={yVal}
                      stroke="#E9F0E5"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={chartLeft - 8}
                      y={yVal + 3}
                      fontSize="10"
                      fill="#8E998D"
                      textAnchor="end"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#greenGrowthAreaGrad)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#006B2C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {coords.map(({ x, y, pt }, idx) => (
                <circle
                  key={pt.label}
                  cx={x}
                  cy={y}
                  r={hoveredIdx === idx ? 5.5 : 3.5}
                  fill={hoveredIdx === idx ? '#FEA619' : '#006B2C'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  role="button"
                  tabIndex={0}
                  aria-label={`${pt.label}: ${pt.count} tài khoản`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  className="cursor-pointer outline-none"
                />
              ))}

              {labelIndices.map((idx) => {
                const item = coords[idx];
                if (!item) return null;
                return (
                  <text
                    key={item.pt.label}
                    x={item.x}
                    y={186}
                    fontSize="10"
                    fill="#717971"
                    textAnchor="middle"
                  >
                    {item.pt.label}
                  </text>
                );
              })}
            </svg>
          </div>

          {activePoint && (
            <div className="px-3 py-1.5 rounded-lg bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#191C19] text-center font-medium">
              {activePoint.label} ({activePoint.periodStart} → {activePoint.periodEnd}): {activePoint.count} đăng ký
            </div>
          )}
        </div>
      )}

      {footerNote && (
        <p className="text-[11px] text-[#717971] text-center">{footerNote}</p>
      )}
    </div>
  );
}
