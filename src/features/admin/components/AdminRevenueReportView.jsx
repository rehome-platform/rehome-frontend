import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';
import adminApi from '../services/adminApi.js';
import { validateDateRange } from '../utils/adminDateUtils.js';

const PAGE_SIZE = 20;

function formatRatePercent(rate) {
  if (rate === null || rate === undefined || Number.isNaN(Number(rate))) return '—';
  const pct = Number(rate) * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/**
 * Báo cáo doanh thu theo kỳ ký gửi & danh sách món đã bán (GET /api/admin/revenue/items).
 * Nhận { from, to, dashboardData } đồng bộ từ AdminDashboardPage.
 */
export default function AdminRevenueReportView({ from, to, dashboardData = {} }) {
  const [term, setTerm] = useState('ALL');
  const [page, setPage] = useState(0);
  const [itemsPage, setItemsPage] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reqSeqRef = useRef(0);
  const prevRangeRef = useRef({ from, to });

  const loadItems = useCallback(
    async (targetPage, targetTerm) => {
      if (validateDateRange(from, to)) {
        setLoading(false);
        return;
      }
      const reqId = ++reqSeqRef.current;
      try {
        setLoading(true);
        setError(null);
        const data = await adminApi.getRevenueItems({
          from,
          to,
          term: targetTerm === 'ALL' ? undefined : Number(targetTerm),
          page: targetPage,
          size: PAGE_SIZE,
        });
        if (reqId === reqSeqRef.current && data) {
          setItemsPage({
            content: Array.isArray(data.content) ? data.content : [],
            page: data.page ?? targetPage,
            size: data.size ?? PAGE_SIZE,
            totalElements: data.totalElements ?? 0,
            totalPages: data.totalPages ?? 0,
          });
        }
      } catch (err) {
        if (reqId === reqSeqRef.current) {
          console.error('Lỗi tải danh sách món đã bán:', err);
          setError('Không thể tải danh sách món đã bán theo kỳ.');
        }
      } finally {
        if (reqId === reqSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [from, to]
  );

  useEffect(() => {
    const rangeChanged = prevRangeRef.current.from !== from || prevRangeRef.current.to !== to;
    if (rangeChanged) {
      prevRangeRef.current = { from, to };
      if (page !== 0) {
        setPage(0);
        return;
      }
    }
    loadItems(page, term);
  }, [from, to, page, term, loadItems]);

  const termCards = [
    {
      label: 'Kỳ 1 (1–30 ngày · 10%)',
      sales: dashboardData.term1SalesRevenue || 0,
      commission: dashboardData.term1Commission || 0,
      accent: 'text-[#006B2C]',
    },
    {
      label: 'Kỳ 2 (31–60 ngày · 15%)',
      sales: dashboardData.term2SalesRevenue || 0,
      commission: dashboardData.term2Commission || 0,
      accent: 'text-[#00685F]',
    },
    {
      label: 'Kỳ 3 (61–90 ngày · 20%)',
      sales: dashboardData.term3SalesRevenue || 0,
      commission: dashboardData.term3Commission || 0,
      accent: 'text-[#D97706]',
    },
  ];

  const totalPages = Math.max(itemsPage.totalPages || 0, 1);
  const currentPage = itemsPage.page ?? page;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#191C19] font-heading">
            Báo Cáo Doanh Thu Nền Tảng Theo Kỳ Kí Gửi
          </h2>
          <p className="text-xs text-[#717971] mt-0.5">
            Doanh thu hoa hồng được chốt lũy tiến (10% - 15% - 20%) cho các đơn hoàn thành ({dashboardData.totalSoldItemsCount || 0} món · Biên nền tảng {dashboardData.netProfitMarginPercent || 0}%)
          </p>
        </div>
      </div>

      {/* Tóm tắt doanh thu & hoa hồng theo 3 kỳ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {termCards.map((card) => (
          <div
            key={card.label}
            className="bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-2"
          >
            <p className="text-xs font-bold text-[#414942]">{card.label}</p>
            <div>
              <p className="text-[11px] text-[#717971]">Hoa hồng thu được</p>
              <p className={`text-xl font-black font-heading ${card.accent}`}>
                {formatCurrencyVND(card.commission)}
              </p>
            </div>
            <p className="text-[11px] text-[#717971] pt-2 border-t border-[#F0F4EE]">
              Doanh thu bán hàng hóa: <strong className="text-[#191C19]">{formatCurrencyVND(card.sales)}</strong>
            </p>
          </div>
        ))}
      </div>

      {/* Bảng danh sách món đã bán */}
      <div className="bg-white rounded-2xl border border-[#E2E8E0] shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#191C19] font-heading">
              Danh Sách Món Đã Bán Theo Kỳ
            </h3>
            <p className="text-xs text-[#717971]">
              Tổng cộng <strong className="text-[#191C19]">{itemsPage.totalElements}</strong> món trong đơn hoàn thành
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="revenue-term-select" className="text-xs font-medium text-[#414942]">
              Kỳ ký gửi:
            </label>
            <select
              id="revenue-term-select"
              aria-label="Lọc theo kỳ ký gửi"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs font-medium text-[#191C19] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
            >
              <option value="ALL">Tất cả kỳ</option>
              <option value="1">Kỳ 1 (10%)</option>
              <option value="2">Kỳ 2 (15%)</option>
              <option value="3">Kỳ 3 (20%)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center text-xs text-[#717971]">
            Đang tải danh sách món đã bán theo kỳ...
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2">
            <p className="text-xs font-semibold text-[#B91C1C]">{error}</p>
            <button
              type="button"
              onClick={() => loadItems(currentPage, term)}
              className="px-3 py-1.5 rounded-lg bg-[#006B2C] text-white text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : itemsPage.content.length === 0 ? (
          <div className="p-10 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-[#006B2C]">query_stats</span>
            <h4 className="text-sm font-bold text-[#191C19]">
              Chưa có món đã bán nào phù hợp
            </h4>
            <p className="text-xs text-[#717971]">
              Không ghi nhận món hàng thuộc đơn hoàn thành trong khoảng thời gian hoặc kỳ đã chọn.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#E2E8E0]">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-[#F8FAF8] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#E2E8E0]">
                  <tr>
                    <th className="py-3 px-4">Sản phẩm</th>
                    <th className="py-3 px-4">Đơn hàng</th>
                    <th className="py-3 px-4 text-right">Giá bán</th>
                    <th className="py-3 px-4 text-center">Kỳ áp dụng</th>
                    <th className="py-3 px-4 text-right">Hoa hồng</th>
                    <th className="py-3 px-4">Ngày hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E0]">
                  {itemsPage.content.map((item) => (
                    <tr key={item.orderItemId} className="hover:bg-[#F8FAF8]/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#191C19]">{item.productName || '—'}</p>
                        <p className="text-[11px] font-mono text-[#717971]">{item.productId || '—'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#00685F] whitespace-nowrap">
                        {item.orderNo || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#191C19] whitespace-nowrap">
                        {formatCurrencyVND(item.price)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.termApplied ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#006B2C] font-bold text-[10px]">
                            Kỳ {item.termApplied}
                          </span>
                        ) : (
                          <span className="text-[#717971]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <p className="font-bold text-[#006B2C]">
                          {item.commissionAmount != null ? formatCurrencyVND(item.commissionAmount) : '—'}
                        </p>
                        <p className="text-[11px] text-[#717971]">
                          ({formatRatePercent(item.commissionRate)})
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#717971] whitespace-nowrap">
                        {formatDateTime(item.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#717971]">
              <span>
                Trang <strong className="text-[#191C19]">{currentPage + 1}</strong> / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage <= 0}
                  className="px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-white hover:bg-[#F8FAF8] text-[#191C19] font-semibold disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={currentPage + 1 >= totalPages}
                  className="px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-white hover:bg-[#F8FAF8] text-[#191C19] font-semibold disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

