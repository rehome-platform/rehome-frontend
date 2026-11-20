import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi.js';
import AdminPeriodFilter from './AdminPeriodFilter.jsx';
import ComparisonBadge from './ComparisonBadge.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';
import usePreviousTotal from '../hooks/usePreviousTotal.js';
import { Spinner } from '../../../components/common/index.js';
import { pickTrendGranularity } from '../utils/adminDateUtils.js';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'MEMBER', label: 'Thành viên' },
  { value: 'ORGANIZATION', label: 'Tổ chức' },
  { value: 'MODERATOR', label: 'Nhân viên điểm kí gửi' },
  { value: 'ADMIN', label: 'Quản trị viên' },
];

/**
 * Biểu đồ tăng trưởng đăng ký tài khoản (GET /api/admin/accounts/growth). Dùng cùng kiểu bộ lọc thời gian với
 * khối doanh thu (chọn nhanh hoặc một ngày / tuần / tháng / năm / khoảng ngày) và lọc theo vai trò.
 * Không có "Toàn thời gian" vì API chỉ trả 30 ngày gần nhất khi bỏ trống ngày bắt đầu.
 * Độ chi tiết (ngày, tuần, tháng) tự chọn theo độ dài khoảng.
 */
export default function AdminAccountGrowthChart({ footerNote }) {
  const filter = useAdminPeriod('LAST30');
  const { activeRange, dateError, previousRange, previousPeriodLabel } = filter;
  const from = activeRange.apiFrom;
  const to = activeRange.apiTo;
  const granularity = pickTrendGranularity(from, to);
  const [role, setRole] = useState('ALL');

  const fetchPreviousTotal = useCallback(
    (range) => adminApi.getAccountGrowthTotal({ from: range.apiFrom, to: range.apiTo, role: role === 'ALL' ? undefined : role }),
    [role]
  );
  const { previousTotal, loadingPrevious } = usePreviousTotal(fetchPreviousTotal, previousRange, [role]);

  const [growthData, setGrowthData] = useState({
    granularity: 'day',
    from,
    to,
    total: 0,
    points: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const reqSeqRef = useRef(0);

  const fetchGrowth = useCallback(async () => {
    if (dateError) {
      setLoading(false);
      return;
    }

    const reqId = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAccountGrowth({
        from,
        to,
        granularity,
        role: role === 'ALL' ? undefined : role,
      });
      if (reqId === reqSeqRef.current && data) {
        setGrowthData({
          granularity: data.granularity || granularity,
          from: data.from || from,
          to: data.to || to,
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
          setError('Khoảng thời gian vượt quá 366 kỳ dữ liệu. Vui lòng thu hẹp khoảng thời gian.');
        } else {
          setError('Không thể tải biểu đồ tăng trưởng tài khoản.');
        }
      }
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false);
      }
    }
  }, [from, to, granularity, role, dateError]);

  useEffect(() => {
    fetchGrowth();
  }, [fetchGrowth]);

  const points = growthData.points || [];
  const maxCount = Math.max(1, ...points.map((p) => Number(p.count || 0)));
  const yTicks = [...new Set([maxCount, Math.round(maxCount * 0.66), Math.round(maxCount * 0.33), 0])];

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
    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-bold text-[#1F2A37] font-heading">
          Tài khoản mới theo chu kỳ
        </h3>
        {!loading && !error && !dateError && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#1F2A37] font-heading">
              {growthData.total} tài khoản mới
            </span>
            <ComparisonBadge
              current={growthData.total}
              previous={previousTotal}
              loading={loadingPrevious}
              label={previousPeriodLabel}
            />
          </div>
        )}
      </div>

      {/* Bộ lọc riêng của biểu đồ: thời gian + vai trò */}
      <div className="rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] p-3 flex flex-wrap items-end gap-3">
        <AdminPeriodFilter filter={filter} name="tăng trưởng" allowAll={false} />
        <label className="flex flex-col gap-1 text-xs text-[#5B6776]">
          <span>Vai trò</span>
          <select
            aria-label="Lọc vai trò tăng trưởng"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-[#DDE5D9] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {dateError && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]"
        >
          {dateError}
        </div>
      )}

      {/* Nội dung biểu đồ */}
      {dateError ? null : error ? (
        <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2 my-auto">
          <p className="text-xs font-semibold text-[#B91C1C]">{error}</p>
          <button
            type="button"
            onClick={fetchGrowth}
            className="px-3 py-1.5 rounded-lg bg-[#006B2C] text-white text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="h-56 flex flex-col items-center justify-center gap-3 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#5B6776]">
          <Spinner size="lg" />
          <span>Đang tải dữ liệu tăng trưởng tài khoản...</span>
        </div>
      ) : points.length === 0 ? (
        <div className="h-56 flex items-center justify-center rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#5B6776]">
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
                      fill="#5B6776"
                      textAnchor="end"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#greenGrowthAreaGrad)" className="chart-fade-in" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#006B2C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="1"
                  className="chart-line-draw"
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
                  className="cursor-pointer outline-none chart-fade-in"
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
                    fill="#5B6776"
                    textAnchor="middle"
                  >
                    {item.pt.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="min-h-[2.25rem] flex items-center justify-center">
            {activePoint ? (
              <div className="w-full px-3 py-1.5 rounded-lg bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#1F2A37] text-center font-medium">
                {activePoint.label} ({activePoint.periodStart} → {activePoint.periodEnd}): {Number(activePoint.count || 0).toLocaleString('vi-VN')} đăng ký
              </div>
            ) : (
              <p className="text-[11px] text-[#5B6776]">
                Di chuột hoặc chọn mốc trên biểu đồ để xem chi tiết số lượng đăng ký.
              </p>
            )}
          </div>
        </div>
      )}

      {footerNote && (
        <p className="text-[11px] text-[#5B6776] text-center">{footerNote}</p>
      )}
    </div>
  );
}
