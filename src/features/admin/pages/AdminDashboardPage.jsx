import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { Button } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';
import AdminOverviewView from '../components/AdminOverviewView.jsx';
import AdminRevenueReportView from '../components/AdminRevenueReportView.jsx';
import AdminRevenueTrendChart from '../components/AdminRevenueTrendChart.jsx';
import AdminWarehouseOverview from '../components/AdminWarehouseOverview.jsx';
import AdminPeriodFilter from '../components/AdminPeriodFilter.jsx';
import AdminExportExcelModal from '../components/AdminExportExcelModal.jsx';
import ComparisonBadge from '../components/ComparisonBadge.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';
import usePreviousTotal from '../hooks/usePreviousTotal.js';

const DEFAULT_DASHBOARD = {
  revenue: 0,
  ordersCount: 0,
  inventoryCount: 0,
  avgServiceRating: 0,
  walletBalanceHeld: 0,
  platformRevenue: 0,
  commissionRevenue: 0,
  withdrawalFeeRevenue: 0,
  compensationExpense: 0,
  fundBalance: 0,
  heldOrderAmount: 0,
  heldOrderCount: 0,
  overdueTaskCount: 0,
  term1SalesRevenue: 0,
  term1Commission: 0,
  term2SalesRevenue: 0,
  term2Commission: 0,
  term3SalesRevenue: 0,
  term3Commission: 0,
  term1StockCount: 0,
  term2StockCount: 0,
  term3StockCount: 0,
  totalSoldItemsCount: 0,
  netProfitMarginPercent: 0,
};

const TABS = [
  { id: 'revenue', label: 'Doanh thu', icon: 'payments' },
  { id: 'users', label: 'Người dùng', icon: 'group' },
  { id: 'warehouse', label: 'Kho', icon: 'warehouse' },
];

/**
 * Trang Tổng quan điều hành (Admin), 3 tab:
 * - Doanh thu: doanh thu nền tảng, tiền đang giữ hộ, biểu đồ theo thời gian, danh sách món đã bán.
 *   Nút Xuất Excel mở hộp thoại riêng (AdminExportExcelModal): bộ lọc thời gian độc lập + tick khối cần xuất.
 * - Người dùng: số tài khoản, tăng trưởng, hoạt động gần đây.
 * - Kho: tồn kho theo trạng thái / kỳ, tác vụ quá hạn, đánh giá dịch vụ kho.
 * Giao dịch (quỹ nền tảng ↔ ví Member) nằm ở trang riêng (/admin/fund-ledger).
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('revenue');
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const filter = useAdminPeriod('MONTH');
  const { activeRange, dateError, previousRange, previousPeriodLabel } = filter;

  const fetchPreviousPlatformRevenue = useCallback(
    (range) => adminApi.getRevenueTrendTotal({ from: range.apiFrom, to: range.apiTo }),
    []
  );
  const { previousTotal: previousPlatformRevenue, loadingPrevious: loadingPreviousRevenue } = usePreviousTotal(
    fetchPreviousPlatformRevenue,
    previousRange
  );

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(DEFAULT_DASHBOARD);

  const dashSeqRef = useRef(0);

  useEffect(() => {
    if (dateError) return;

    const reqId = ++dashSeqRef.current;
    const loadData = async () => {
      try {
        setLoading(true);
        const dashRes = await adminApi.getDashboard({
          from: activeRange.apiFrom,
          to: activeRange.apiTo,
        });
        if (reqId === dashSeqRef.current && dashRes) {
          setDashboardData({ ...DEFAULT_DASHBOARD, ...dashRes });
        }
      } catch (err) {
        if (reqId === dashSeqRef.current) {
          console.error('Lỗi tải dữ liệu dashboard:', err);
        }
      } finally {
        if (reqId === dashSeqRef.current) {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [activeRange.apiFrom, activeRange.apiTo, dateError]);

  const revenueMetrics = [
    {
      label: 'Doanh thu nền tảng',
      value: dashboardData.platformRevenue || 0,
      description: 'Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù',
      icon: 'trending_up',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
      badge: 'Theo khoảng thời gian đã chọn',
      // "Tiền đang giữ hộ" là số dư hiện tại (không lọc theo kỳ) nên không có "kỳ trước" để so sánh
      comparison: previousPeriodLabel && {
        previous: previousPlatformRevenue,
        loading: loadingPreviousRevenue,
        label: previousPeriodLabel,
      },
    },
    {
      label: 'Tiền đang giữ hộ',
      value: dashboardData.heldOrderAmount || 0,
      description: 'Người mua đã thanh toán nhưng đơn chưa hoàn tất, nền tảng chưa trả cho người bán',
      icon: 'lock_clock',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#D97706]',
      badge: 'Số hiện tại',
      comparison: null,
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Tab Switcher + (tab Doanh thu) Bộ lọc thời gian & Xuất Excel */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-[#E2E8E0] pb-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Các mục tổng quan">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-[#006B2C] text-white shadow-sm'
                  : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'revenue' && (
          <AdminPeriodFilter filter={filter}>
            <Button
              onClick={() => setExportModalOpen(true)}
              className="bg-[#00685F] hover:bg-[#005049] text-white text-xs shrink-0 rounded-xl px-4 py-2 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] mr-1.5">file_download</span>
              Xuất báo cáo Excel
            </Button>
          </AdminPeriodFilter>
        )}
      </div>

      <AdminExportExcelModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />

      {/* Tab Doanh thu */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {dateError && (
            <div
              role="alert"
              className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]"
            >
              {dateError}
            </div>
          )}

          {/* 2 thẻ: Doanh thu nền tảng & Tiền đang giữ hộ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {revenueMetrics.map((m, idx) => (
              <div
                key={m.label}
                className="chart-fade-up bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between hover:border-[#006B2C]/40 transition-all duration-200"
                style={{ '--i': idx }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#F8FAF8] text-[#414942] border border-[#E2E8E0]">
                      {m.badge}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl ${m.iconBg} ${m.iconColor} flex items-center justify-center shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{m.icon}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-[#717971]">{m.label}</p>
                  <p className="text-2xl font-black font-heading text-[#191C19] mt-1 tracking-tight">
                    {loading ? '...' : formatCurrencyVND(m.value)}
                  </p>
                  {m.comparison && !loading && (
                    <div className="mt-1.5">
                      <ComparisonBadge
                        current={m.value}
                        previous={m.comparison.previous}
                        loading={m.comparison.loading}
                        label={m.comparison.label}
                      />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#717971] mt-3">{m.description}</p>
              </div>
            ))}
          </div>

          {/* Biểu đồ doanh thu theo thời gian (có bộ lọc riêng, không phụ thuộc bộ lọc ở đầu trang) */}
          <AdminRevenueTrendChart />

          {/* Danh sách món đã bán theo kỳ */}
          <AdminRevenueReportView
            from={activeRange.apiFrom}
            to={activeRange.apiTo}
            dashboardData={dashboardData}
            showSummary={false}
          />
        </div>
      )}

      {/* Tab Người dùng */}
      {activeTab === 'users' && (
        <AdminOverviewView onNavigateToAudit={() => navigate('/admin/audit-logs')} />
      )}

      {/* Tab Kho */}
      {activeTab === 'warehouse' && <AdminWarehouseOverview />}
    </div>
  );
}
