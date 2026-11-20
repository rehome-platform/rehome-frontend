import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import adminApi from '../services/adminApi.js';
import AdminPeriodFilter from './AdminPeriodFilter.jsx';
import ComparisonBadge from './ComparisonBadge.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';
import { Spinner } from '../../../components/common/index.js';
import usePreviousTotal from '../hooks/usePreviousTotal.js';
import { pickTrendGranularity } from '../utils/adminDateUtils.js';

const UNIT_NAME = { day: 'ngày', week: 'tuần', month: 'tháng' };

const COLOR_BAR = '#006B2C';
const COLOR_BEST = '#FEA619';

// Chỉ ghi số tiền trên đầu cột khi không quá dày, tránh các nhãn chồng lên nhau
const MAX_BARS_WITH_VALUE_LABEL = 14;
const MAX_X_LABELS = 8;

const fmt = (x, digits) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(x);

// 1.250.000 -> "1,3 tr"; dùng cho nhãn trục tung và đầu cột cho gọn
function formatCompactVND(value) {
  const n = Number(value || 0);
  if (n >= 1e9) return `${fmt(n / 1e9, 1)} tỷ`;
  if (n >= 1e6) return `${fmt(n / 1e6, 1)} tr`;
  if (n >= 1e3) return `${fmt(n / 1e3, 0)}k`;
  return fmt(n, 0);
}

// Làm tròn cận trên trục tung lên số "đẹp" (1, 2, 5 x 10^k) để các vạch kẻ là số tròn
function niceMax(value) {
  if (!(value > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

// 2026-11-10 -> 10/11
function shortDate(iso) {
  const [, m, d] = String(iso || '').split('-');
  return d && m ? `${d}/${m}` : String(iso || '');
}

// 2026-11-10 -> 10/11/2026
function fullDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(iso || '');
}

// Nhãn ngắn dưới trục hoành: ngày/tuần -> ngày bắt đầu kỳ (dd/MM), tháng -> MM/yyyy
function axisLabel(point, granularity) {
  if (!point.periodStart) return point.label;
  if (granularity === 'month') {
    const [y, m] = point.periodStart.split('-');
    return `${m}/${y}`;
  }
  return shortDate(point.periodStart);
}

// Tên đầy đủ của kỳ, dùng cho chú thích khi rê chuột
function periodName(point, granularity) {
  if (!point.periodStart) return point.label;
  if (granularity === 'month') {
    const [y, m] = point.periodStart.split('-');
    return `Tháng ${m}/${y}`;
  }
  if (granularity === 'week') {
    return `Tuần ${fullDate(point.periodStart)} → ${fullDate(point.periodEnd)}`;
  }
  return `Ngày ${fullDate(point.periodStart)}`;
}

/**
 * Biểu đồ doanh thu nền tảng (hoa hồng + phí rút hàng) theo ngày/tuần/tháng
 * (GET /api/admin/dashboard/revenue-trend). Có bộ lọc thời gian RIÊNG (độc lập với bộ lọc ở đầu trang):
 * chọn nhanh hoặc chọn một ngày / tuần / tháng / năm / khoảng ngày. Độ chi tiết (ngày, tuần, tháng) tự chọn
 * theo độ dài khoảng để số cột luôn vừa phải.
 */
export default function AdminRevenueTrendChart() {
  const filter = useAdminPeriod('MONTH');
  const { activeRange, dateError, previousRange, previousPeriodLabel } = filter;
  const from = activeRange.apiFrom;
  const to = activeRange.apiTo;
  const granularity = pickTrendGranularity(from, to);

  const fetchPreviousTotal = useCallback(
    (range) => adminApi.getRevenueTrendTotal({ from: range.apiFrom, to: range.apiTo }),
    []
  );
  const { previousTotal, loadingPrevious } = usePreviousTotal(fetchPreviousTotal, previousRange);

  const [trend, setTrend] = useState({ total: 0, from: undefined, to: undefined, granularity: 'day', points: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const reqSeqRef = useRef(0);

  const fetchTrend = useCallback(async () => {
    if (dateError) {
      setLoading(false);
      return;
    }
    const reqId = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getRevenueTrend({ from, to, granularity });
      if (reqId === reqSeqRef.current && data) {
        setTrend({
          total: data.total ?? 0,
          from: data.from,
          to: data.to,
          granularity: data.granularity || granularity,
          points: Array.isArray(data.points) ? data.points : [],
        });
        setHoveredIdx(null);
      }
    } catch (err) {
      if (reqId === reqSeqRef.current) {
        console.error('Lỗi tải biểu đồ doanh thu:', err);
        if (err?.response?.data?.code === 'INVALID_DATE_RANGE') {
          setError('Khoảng thời gian vượt quá 366 kỳ dữ liệu. Vui lòng thu hẹp khoảng thời gian.');
        } else {
          setError('Không thể tải biểu đồ doanh thu nền tảng.');
        }
      }
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false);
      }
    }
  }, [from, to, granularity, dateError]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  const shownGranularity = trend.granularity;
  const unit = UNIT_NAME[shownGranularity] || 'kỳ';
  const points = trend.points;
  const amounts = points.map((p) => Number(p.amount || 0));
  const maxAmount = Math.max(0, ...amounts);
  const axisMax = niceMax(maxAmount);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => axisMax * r);

  const bestIdx = maxAmount > 0 ? amounts.indexOf(maxAmount) : -1;
  const average = points.length > 0 ? Math.round(trend.total / points.length) : 0;

  const chartLeft = 54;
  const chartRight = 590;
  const chartTop = 28;
  const chartBottom = 214;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const slot = points.length > 0 ? chartWidth / points.length : chartWidth;
  const barWidth = Math.max(3, Math.min(44, slot * 0.62));
  const showValueLabels = points.length <= MAX_BARS_WITH_VALUE_LABEL;

  const columns = points.map((pt, idx) => {
    const amount = amounts[idx];
    const barHeight = (amount / axisMax) * chartHeight;
    const center = chartLeft + slot * idx + slot / 2;
    return { pt, idx, center, barHeight, amount };
  });

  // Nhãn trục hoành: đủ thì hiện hết, nhiều quá thì chọn cách đều nhau
  const labelStep = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const labelIndices = points
    .map((_, i) => i)
    .filter((i) => i % labelStep === 0 || i === points.length - 1)
    .filter((i, pos, arr) => pos === 0 || i - arr[pos - 1] >= Math.ceil(labelStep / 2));

  const activePoint = hoveredIdx !== null && columns[hoveredIdx] ? columns[hoveredIdx].pt : null;
  const hasRevenue = trend.total > 0 || amounts.some((a) => a > 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-xs flex flex-col gap-5">
      <div>
        <h3 className="text-base font-bold text-[#1F2A37] font-heading">
          Doanh thu nền tảng theo thời gian
        </h3>
        <p className="text-xs text-[#5B6776] mt-0.5">
          {trend.from && trend.to && !dateError
            ? `Hoa hồng và phí rút hàng đã thu, từ ${fullDate(trend.from)} đến ${fullDate(trend.to)}`
            : 'Hoa hồng và phí rút hàng đã thu, theo từng kỳ'}
        </p>
      </div>

      {/* Bộ lọc riêng của biểu đồ */}
      <div className="rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] p-3">
        <AdminPeriodFilter filter={filter} name="biểu đồ" />
      </div>

      {dateError && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]"
        >
          {dateError}
        </div>
      )}

      {dateError ? null : error ? (
        <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2">
          <p className="text-xs font-semibold text-[#B91C1C]">{error}</p>
          <button
            type="button"
            onClick={fetchTrend}
            className="px-3 py-1.5 rounded-lg bg-[#006B2C] text-white text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#5B6776]">
          <Spinner size="lg" />
          <span>Đang tải biểu đồ doanh thu...</span>
        </div>
      ) : !hasRevenue ? (
        <div className="h-64 flex items-center justify-center rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#5B6776] text-center px-4">
          Chưa phát sinh doanh thu nền tảng trong khoảng thời gian đã chọn.
        </div>
      ) : (
        <>
          {/* Ba con số chính để đọc nhanh trước khi nhìn biểu đồ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] px-4 py-3">
              <p className="text-[11px] font-medium text-[#5B6776]">Tổng doanh thu</p>
              <p className="mt-0.5 text-lg font-black text-[#006B2C] font-heading">
                {formatCurrencyVND(trend.total)}
              </p>
              <div className="mt-1">
                <ComparisonBadge
                  current={trend.total}
                  previous={previousTotal}
                  loading={loadingPrevious}
                  label={previousPeriodLabel}
                />
              </div>
            </div>
            <div className="rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] px-4 py-3">
              <p className="text-[11px] font-medium text-[#5B6776]">Trung bình mỗi {unit}</p>
              <p className="mt-0.5 text-lg font-black text-[#1F2A37] font-heading">
                {formatCurrencyVND(average)}
              </p>
            </div>
            <div className="rounded-xl bg-[#FFF8EC] border border-[#FDE3B0] px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#5B6776]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_BEST }}></span>
                Cao nhất ({unit})
              </p>
              <p className="mt-0.5 text-lg font-black text-[#B7740B] font-heading">
                {formatCurrencyVND(maxAmount)}
              </p>
              {bestIdx >= 0 && (
                <p className="text-[11px] text-[#5B6776]">{periodName(points[bestIdx], shownGranularity)}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative w-full">
              <svg
                className="w-full h-auto overflow-visible"
                viewBox="0 0 600 240"
                aria-label="Biểu đồ doanh thu nền tảng theo thời gian"
              >
                {/* Vạch kẻ ngang và nhãn trục tung (đơn vị đồng) */}
                {yTicks.map((tick, idx) => {
                  const y = chartBottom - (tick / axisMax) * chartHeight;
                  return (
                    <g key={idx}>
                      <line
                        x1={chartLeft}
                        y1={y}
                        x2={chartRight}
                        y2={y}
                        stroke={idx === 0 ? '#C9D3C5' : '#E9F0E5'}
                        strokeWidth="1"
                      />
                      <text x={chartLeft - 8} y={y + 3} fontSize="10" fill="#8E998D" textAnchor="end">
                        {tick === 0 ? '0' : formatCompactVND(tick)}
                      </text>
                    </g>
                  );
                })}

                {columns.map(({ pt, idx, center, barHeight, amount }) => {
                  const isBest = idx === bestIdx;
                  const dimmed = hoveredIdx !== null && hoveredIdx !== idx;
                  return (
                    <g key={pt.label}>
                      {barHeight > 0 && (
                        <rect
                          className="chart-bar"
                          style={{ '--i': idx, transition: 'opacity 150ms' }}
                          x={center - barWidth / 2}
                          y={chartBottom - barHeight}
                          width={barWidth}
                          height={barHeight}
                          rx="3"
                          fill={isBest ? COLOR_BEST : COLOR_BAR}
                          opacity={dimmed ? 0.45 : 1}
                          pointerEvents="none"
                        />
                      )}
                      {showValueLabels && amount > 0 && (
                        <text
                          className="chart-fade-in"
                          style={{ '--i': idx }}
                          x={center}
                          y={chartBottom - barHeight - 6}
                          fontSize="10"
                          fontWeight="600"
                          fill={isBest ? '#B7740B' : '#5B6776'}
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {formatCompactVND(amount)}
                        </text>
                      )}
                      {/* Vùng bấm/di chuột phủ cả cột để kỳ không có doanh thu vẫn xem được */}
                      <rect
                        x={chartLeft + slot * idx}
                        y={chartTop - 16}
                        width={slot}
                        height={chartHeight + 16}
                        fill="transparent"
                        role="img"
                        tabIndex={0}
                        aria-label={`${pt.label}: ${formatCurrencyVND(amount)}`}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onFocus={() => setHoveredIdx(idx)}
                        onBlur={() => setHoveredIdx(null)}
                        className="outline-none"
                      />
                    </g>
                  );
                })}

                {/* Nhãn trục hoành */}
                {labelIndices.map((idx) => {
                  const col = columns[idx];
                  if (!col) return null;
                  return (
                    <text key={col.pt.label} x={col.center} y={232} fontSize="10" fill="#5B6776" textAnchor="middle">
                      {axisLabel(col.pt, shownGranularity)}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Chú thích luôn chiếm chỗ để biểu đồ không bị nhảy khi rê chuột */}
            <div className="min-h-[2.25rem] px-3 py-2 rounded-lg bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-center text-[#1F2A37]">
              {activePoint ? (
                <span className="font-medium">
                  {periodName(activePoint, shownGranularity)}: <strong>{formatCurrencyVND(activePoint.amount)}</strong>
                </span>
              ) : (
                <span className="text-[#5B6776]">
                  Rê chuột (hoặc nhấn Tab) vào từng cột để xem doanh thu chi tiết · đơn vị: đồng
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
