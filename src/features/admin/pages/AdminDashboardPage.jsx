import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { Button, Badge } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';
import AdminOverviewView from '../components/AdminOverviewView.jsx';
import AdminRevenueBreakdownCard from '../components/AdminRevenueBreakdownCard.jsx';
import AdminFundLedgerSection from '../components/AdminFundLedgerSection.jsx';
import AdminRevenueReportView from '../components/AdminRevenueReportView.jsx';
import {
  getPeriodDateRange,
  getVietnamToday,
  validateDateRange,
} from '../utils/adminDateUtils.js';
import { useToast } from '../../../context/ToastContext.jsx';

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

/**
 * Trang Dashboard Điều Hành & Quỹ Nền Tảng ReHome (Admin)
 * Dùng chung một bộ lọc thời gian cho toàn bộ Dashboard, Báo cáo theo kỳ, Sổ quỹ và Xuất Excel.
 */
export default function AdminDashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('fund');
  const [exporting, setExporting] = useState(false);

  const initialMonth = useMemo(() => getPeriodDateRange('MONTH'), []);
  const [period, setPeriod] = useState('MONTH'); // 'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'
  const [customFrom, setCustomFrom] = useState(initialMonth.exportFrom);
  const [customTo, setCustomTo] = useState(initialMonth.exportTo);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(DEFAULT_DASHBOARD);

  const dashSeqRef = useRef(0);

  const dateError = period === 'CUSTOM' ? validateDateRange(customFrom, customTo) : null;

  const activeRange = useMemo(() => {
    if (period !== 'CUSTOM') {
      return getPeriodDateRange(period);
    }
    const today = getVietnamToday();
    return {
      apiFrom: customFrom || undefined,
      apiTo: customTo || undefined,
      exportFrom: customFrom || '1970-01-01',
      exportTo: customTo || today,
    };
  }, [period, customFrom, customTo]);

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

  const platformRevenueRatio =
    dashboardData.revenue > 0
      ? ((dashboardData.platformRevenue / dashboardData.revenue) * 100).toFixed(1)
      : '0.0';

  const fundMetrics = [
    {
      label: 'Tiền đang giữ hộ',
      value: dashboardData.walletBalanceHeld || 0,
      description: 'Tiền bán được tổng giá của sản phẩm đang giữ hộ cho Member (chờ đối soát rút ví)',
      icon: 'lock_clock',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#D97706]',
      badge: 'Tiền giữ hộ Member',
    },
    {
      label: 'Doanh thu hiện có',
      value: dashboardData.platformRevenue || 0,
      description: 'Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù',
      icon: 'trending_up',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
      badge: 'Doanh thu nền tảng',
      extraInfo: `${platformRevenueRatio}% Tỷ lệ doanh thu nền tảng / tổng tiền đơn hoàn thành`,
    },
    {
      label: 'Số dư quỹ nền tảng',
      value: dashboardData.fundBalance || 0,
      description: 'Tiền thực tế trong tài khoản hệ thống (Tiền giữ + Doanh thu)',
      icon: 'account_balance',
      iconBg: 'bg-[#E0F2F1]',
      iconColor: 'text-[#00685F]',
      badge: 'Cổng thanh toán',
    },
    {
      label: 'Tổng đơn đã thanh toán',
      value: `${dashboardData.ordersCount || 0} đơn`,
      description: 'Bao gồm đơn đang xử lý, đang giao, đã giao, hoàn thành và trả hàng',
      icon: 'local_shipping',
      iconBg: 'bg-[#EDE7F6]',
      iconColor: 'text-[#673AB7]',
      badge: 'Vận hành kho',
    },
  ];

  const handleExportExcel = async () => {
    if (dateError) {
      toast.error(dateError);
      return;
    }

    try {
      setExporting(true);
      const { exportFrom, exportTo } = activeRange;
      const blob = await adminApi.exportDashboard(exportFrom, exportTo);

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_report_${exportFrom}_${exportTo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất báo cáo Excel:', err);
      toast.error('Không thể kết nối API xuất báo cáo Excel. Vui lòng kiểm tra lại quyền Admin hoặc kết nối mạng.');
    } finally {
      setExporting(false);
    }
  };

  const totalStock = dashboardData.inventoryCount || 0;
  const termStocks = [
    { label: 'Kỳ 1', count: Number(dashboardData.term1StockCount || 0), color: 'bg-[#006B2C]' },
    { label: 'Kỳ 2', count: Number(dashboardData.term2StockCount || 0), color: 'bg-[#00685F]' },
    { label: 'Kỳ 3', count: Number(dashboardData.term3StockCount || 0), color: 'bg-[#FEA619]' },
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Tab Switcher + Bộ lọc thời gian dùng chung + Xuất Excel */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-[#E2E8E0] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('fund')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'fund'
                ? 'bg-[#006B2C] text-white shadow-sm'
                : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Quỹ nền tảng &amp; Doanh thu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revenue_report')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'revenue_report'
                ? 'bg-[#006B2C] text-white shadow-sm'
                : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            <span>Báo cáo doanh thu theo kỳ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'activities'
                ? 'bg-[#006B2C] text-white shadow-sm'
                : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">insights</span>
            <span>Hoạt động &amp; Tăng trưởng hệ thống</span>
          </button>
        </div>

        {/* Bộ lọc thời gian dùng chung & nút xuất báo cáo Excel */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[#414942]">
            <span>Khoảng thời gian</span>
            <select
              aria-label="Khoảng thời gian"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              disabled={exporting}
              className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 disabled:opacity-50"
            >
              <option value="TODAY">Hôm nay</option>
              <option value="WEEK">Tuần này</option>
              <option value="MONTH">Tháng này</option>
              <option value="ALL">Toàn thời gian</option>
              <option value="CUSTOM">Tùy chọn ngày</option>
            </select>
          </label>

          {period === 'CUSTOM' && (
            <>
              <label className="flex flex-col gap-1 text-xs text-[#414942]">
                <span>Từ ngày</span>
                <input
                  type="date"
                  aria-label="Từ ngày"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#414942]">
                <span>Đến ngày</span>
                <input
                  type="date"
                  aria-label="Đến ngày"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
                />
              </label>
            </>
          )}

          <Button
            onClick={handleExportExcel}
            loading={exporting}
            className="bg-[#00685F] hover:bg-[#005049] text-white text-xs shrink-0 rounded-xl px-4 py-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">file_download</span>
            Xuất báo cáo Excel
          </Button>
        </div>
      </div>

      {dateError && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]"
        >
          {dateError}
        </div>
      )}

      <p className="text-xs text-[#717971]">
        Doanh thu, số đơn, điểm đánh giá và cơ cấu nguồn thu được lọc theo khoảng thời gian đang chọn (giờ Việt Nam);
        {' '}tồn kho, số dư ví, quỹ nền tảng và việc quá hạn luôn là số liệu hiện tại.
      </p>

      {/* Tab Hoạt động & Tăng trưởng */}
      {activeTab === 'activities' && (
        <AdminOverviewView onNavigateToAudit={() => navigate('/admin/audit-logs')} />
      )}

      {/* Tab Báo cáo doanh thu chi tiết theo kỳ */}
      {activeTab === 'revenue_report' && (
        <AdminRevenueReportView
          from={activeRange.apiFrom}
          to={activeRange.apiTo}
          dashboardData={dashboardData}
        />
      )}

      {/* Tab Quỹ & Doanh thu Chính */}
      {activeTab === 'fund' && (
        <div className="space-y-6">
          {/* 4 Thẻ Quỹ & Dòng tiền */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {fundMetrics.map((m, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between hover:border-[#006B2C]/40 transition-all duration-200"
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
                    {loading ? '...' : typeof m.value === 'number' ? formatCurrencyVND(m.value) : m.value}
                  </p>
                </div>

                <p className="text-[11px] text-[#717971] mt-3">{m.description}</p>
                {m.extraInfo && (
                  <div className="mt-3 pt-2.5 border-t border-[#F0F5EE] flex items-center gap-1.5 text-xs font-bold text-[#006B2C]">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span>{m.extraInfo}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 2 Khối Trung tâm: Cơ cấu Doanh thu & Thống kê Tồn kho theo kỳ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <AdminRevenueBreakdownCard
              dashboardData={dashboardData}
              onViewDetail={() => setActiveTab('revenue_report')}
            />

            {/* Thống kê sản phẩm đang tồn kho trong mỗi kỳ (5 cột) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between">
              <div className="border-b border-[#E2E8E0] pb-3 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#191C19] font-heading">
                    Tồn Kho Trong Kho Hàng
                  </h3>
                  <Badge variant="outline">Tổng: {totalStock} món</Badge>
                </div>
                <p className="text-xs text-[#717971] mt-0.5">
                  Số lượng sản phẩm thực tế đang lưu tại hệ thống kho theo kỳ hiện tại
                </p>
              </div>

              {totalStock === 0 ? (
                <div className="p-8 my-auto rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-2xl">inventory_2</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#191C19]">
                    Kho hàng hiện chưa có sản phẩm tồn
                  </h4>
                  <p className="text-[11px] text-[#717971] mt-0.5">
                    Số liệu sẽ cập nhật khi có sản phẩm được nhập kho.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#191C19]">Phân bổ tồn kho theo kỳ</span>
                      <span className="text-xs font-extrabold text-[#006B2C]">{totalStock} món</span>
                    </div>

                    <div className="space-y-2">
                      {termStocks.map((t) => {
                        const pct = totalStock > 0 ? Math.round((t.count / totalStock) * 100) : 0;
                        return (
                          <div key={t.label} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#414942]">
                                {t.label}: {t.count} món
                              </span>
                              <span className="text-[#717971]">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#E2E8E0] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${t.color}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] flex items-center justify-between text-xs">
                    <span className="text-[#414942]">Đánh giá dịch vụ kho:</span>
                    <span className="font-bold text-[#006B2C]">
                      {dashboardData.avgServiceRating ? `${dashboardData.avgServiceRating} ★` : 'Chưa có đánh giá'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] flex items-center justify-between text-xs">
                    <span className="text-[#414942]">Tác vụ quá hạn cần xử lý:</span>
                    <span className={`font-bold ${dashboardData.overdueTaskCount > 0 ? 'text-[#DC2626]' : 'text-[#006B2C]'}`}>
                      {dashboardData.overdueTaskCount || 0} việc
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[#E2E8E0] text-[11px] text-[#717971] flex items-center justify-between">
                <span>Hết 90 ngày: Gỡ khỏi sàn &amp; gửi thông báo 30 ngày</span>
              </div>
            </div>
          </div>

          {/* Nhật ký ghi sổ kép & đối soát quỹ nền tảng */}
          <AdminFundLedgerSection from={activeRange.apiFrom} to={activeRange.apiTo} />
        </div>
      )}
    </div>
  );
}
