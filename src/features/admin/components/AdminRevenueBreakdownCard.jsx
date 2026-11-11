import React from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';

const CIRCUMFERENCE = 2 * Math.PI * 38;

/**
 * Khối Cơ Cấu Doanh Thu Nền Tảng (Tab Quỹ & Doanh thu).
 * Hiển thị tỷ trọng hoa hồng Kỳ 1/2/3, phí rút hàng và tách riêng chi đền bù hàng xuống cấp.
 */
export default function AdminRevenueBreakdownCard({ dashboardData = {}, onViewDetail }) {
  const platformRevenue = Number(dashboardData.platformRevenue || 0);
  const commissionRevenue = Number(dashboardData.commissionRevenue || 0);
  const withdrawalFeeRevenue = Number(dashboardData.withdrawalFeeRevenue || 0);
  const compensationExpense = Number(dashboardData.compensationExpense || 0);
  const totalSoldItemsCount = Number(dashboardData.totalSoldItemsCount || 0);
  const netProfitMarginPercent = Number(dashboardData.netProfitMarginPercent || 0);

  const items = [
    {
      key: 'term1',
      label: 'Hoa hồng Kỳ 1 (1–30 ngày)',
      value: Number(dashboardData.term1Commission || 0),
      sales: Number(dashboardData.term1SalesRevenue || 0),
      color: '#006B2C',
      dotClass: 'bg-[#006B2C]',
    },
    {
      key: 'term2',
      label: 'Hoa hồng Kỳ 2 (31–60 ngày)',
      value: Number(dashboardData.term2Commission || 0),
      sales: Number(dashboardData.term2SalesRevenue || 0),
      color: '#00685F',
      dotClass: 'bg-[#00685F]',
    },
    {
      key: 'term3',
      label: 'Hoa hồng Kỳ 3 (61–90 ngày)',
      value: Number(dashboardData.term3Commission || 0),
      sales: Number(dashboardData.term3SalesRevenue || 0),
      color: '#FEA619',
      dotClass: 'bg-[#FEA619]',
    },
    {
      key: 'withdrawal',
      label: 'Phí rút hàng trước hạn',
      value: withdrawalFeeRevenue,
      sales: null,
      color: '#673AB7',
      dotClass: 'bg-[#673AB7]',
    },
  ];

  const totalBreakdown = items.reduce((sum, item) => sum + item.value, 0);
  const hasRevenue = totalBreakdown > 0 || platformRevenue > 0;

  let cumulativePct = 0;
  const segments = items.map((item) => {
    const pct = totalBreakdown > 0 ? item.value / totalBreakdown : 0;
    const dash = (pct * CIRCUMFERENCE).toFixed(2);
    const offset = -(cumulativePct * CIRCUMFERENCE);
    cumulativePct += pct;
    return {
      ...item,
      pct,
      pctLabel: (pct * 100).toFixed(1),
      dash,
      offset,
    };
  });

  return (
    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8E0] pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Cơ Cấu Doanh Thu Nền Tảng
          </h3>
          <p className="text-xs text-[#717971] mt-0.5">
            Tỷ trọng hoa hồng Kỳ 1, Kỳ 2, Kỳ 3 &amp; phí rút hàng ({totalSoldItemsCount} món đã bán · Biên nền tảng {netProfitMarginPercent}%)
          </p>
        </div>
        {onViewDetail && (
          <button
            type="button"
            onClick={onViewDetail}
            className="text-xs font-bold text-[#006B2C] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Xem chi tiết báo cáo</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        )}
      </div>

      {!hasRevenue ? (
        <div className="p-6 my-auto rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-2xl">pie_chart</span>
          </div>
          <h4 className="text-sm font-bold text-[#191C19]">
            Chưa phát sinh doanh thu nền tảng trong khoảng thời gian này
          </h4>
          <p className="text-xs text-[#717971] max-w-sm mt-1">
            Hoa hồng ({formatCurrencyVND(commissionRevenue)}) và phí rút hàng ({formatCurrencyVND(withdrawalFeeRevenue)}) sẽ hiển thị tự động khi có giao dịch hoàn tất.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-auto">
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-label="Biểu đồ cơ cấu doanh thu nền tảng">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#E9F0E5"
                  strokeWidth="12"
                />
                {segments.map((seg) =>
                  seg.value > 0 ? (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={`${seg.dash} ${CIRCUMFERENCE}`}
                      strokeDashoffset={seg.offset}
                    />
                  ) : null
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#717971]">
                  Doanh thu
                </span>
                <span className="text-sm font-black text-[#191C19] font-heading leading-tight mt-0.5">
                  {formatCurrencyVND(platformRevenue)}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#414942] text-center">
              Hoa hồng: <strong className="text-[#006B2C]">{formatCurrencyVND(commissionRevenue)}</strong>
              {' · '}
              Phí rút: <strong className="text-[#673AB7]">{formatCurrencyVND(withdrawalFeeRevenue)}</strong>
            </div>
          </div>

          <div className="md:col-span-7 space-y-2.5">
            {segments.map((seg) => (
              <div
                key={seg.key}
                className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-[#191C19]">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dotClass}`} />
                    <span>{seg.label}</span>
                  </span>
                  <span className="font-bold text-[#191C19] whitespace-nowrap">
                    {formatCurrencyVND(seg.value)} ({seg.pctLabel}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8E0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, seg.pct * 100))}%`,
                      backgroundColor: seg.color,
                    }}
                  />
                </div>
                {seg.sales !== null && (
                  <p className="text-[10px] text-[#717971]">
                    Doanh thu bán hàng hóa: <span className="font-semibold text-[#414942]">{formatCurrencyVND(seg.sales)}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Khoản chi đền bù tách riêng khỏi doanh thu nền tảng */}
      <div className="mt-4 pt-3 border-t border-[#E2E8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-md bg-[#FFF3E0] text-[#D97706] font-bold text-[10px] border border-[#FDE68A]">
            Khoản chi riêng
          </span>
          <span className="text-[#414942] font-medium">
            Chi đền bù hàng xuống cấp (không trừ vào doanh thu nền tảng):
          </span>
        </div>
        <span className="text-sm font-extrabold text-[#D97706] whitespace-nowrap">
          {formatCurrencyVND(compensationExpense)}
        </span>
      </div>
    </div>
  );
}
