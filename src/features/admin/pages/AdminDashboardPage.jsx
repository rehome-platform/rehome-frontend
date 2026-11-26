import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { Button } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import AdminOverviewView from '../components/AdminOverviewView.jsx';
import AdminRevenueReportView from '../components/AdminRevenueReportView.jsx';
import AdminRevenueTrendChart from '../components/AdminRevenueTrendChart.jsx';
import AdminWarehouseOverview from '../components/AdminWarehouseOverview.jsx';
import AdminPeriodFilter from '../components/AdminPeriodFilter.jsx';
import AdminExportExcelModal from '../components/AdminExportExcelModal.jsx';
import ComparisonBadge from '../components/ComparisonBadge.jsx';
import AdminDonutChart from '../components/AdminDonutChart.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';
import usePreviousTotal from '../hooks/usePreviousTotal.js';
import {
  DASHBOARD_STALE_TIME_MS,
  STATIC_STALE_TIME_MS,
  useAdminCache,
} from '../hooks/useAdminQuery.jsx';
import { PAID_TIERS, TIER_SHORT_LABELS, TIER_HEX_COLOR } from '../membership/membershipConstants.js';
import { DASHBOARD_TONES, DASHBOARD_CARD_CLASS } from '../../../constants/dashboardTheme.js';

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
  { id: 'warehouse', label: 'Địa điểm ký gửi', icon: 'warehouse' },
];

/**
 * Trang Tổng quan điều hành (Admin), 3 tab:
 * - Doanh thu: doanh thu nền tảng, tiền đang giữ hộ, biểu đồ theo thời gian, danh sách món đã bán.
 *   Nút Xuất Excel mở hộp thoại riêng (AdminExportExcelModal): bộ lọc thời gian độc lập + tick khối cần xuất.
 * - Người dùng: số tài khoản, tăng trưởng, hoạt động gần đây.
 * - Kho: tồn kho theo trạng thái / kỳ, tác vụ quá hạn, đánh giá dịch vụ kho.
 * Giao dịch (quỹ nền tảng ↔ ví Member) nằm ở trang riêng (/admin/fund-ledger).
 */
const DASHBOARD_TAB_CACHE_KEY = 'admin:dashboard:ui:activeTab';
const PLANS_CACHE_KEY = 'admin:membership:plans';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const cache = useAdminCache();

  const [activeTab, setActiveTab] = useState(
    () => cache?.read(DASHBOARD_TAB_CACHE_KEY)?.data || 'revenue'
  );
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    cache?.write(DASHBOARD_TAB_CACHE_KEY, tabId);
  };

  const filter = useAdminPeriod('MONTH');
  const { activeRange, dateError, previousRange, previousPeriodLabel } = filter;

  const dashSummaryKey = `admin:dashboard:summary:${activeRange.apiFrom || ''}:${activeRange.apiTo || ''}`;
  const membershipStatsKey = `admin:dashboard:membership-stats:${activeRange.apiFrom || ''}:${activeRange.apiTo || ''}`;
  const prevPlatformRevKey = previousRange
    ? `admin:dashboard:prev-platform-rev:${previousRange.apiFrom || ''}:${previousRange.apiTo || ''}`
    : null;
  const prevMembershipRevKey = previousRange
    ? `admin:dashboard:prev-membership-rev:${previousRange.apiFrom || ''}:${previousRange.apiTo || ''}`
    : null;

  const fetchPreviousPlatformRevenue = useCallback(
    (range) => adminApi.getRevenueTrendTotal({ from: range.apiFrom, to: range.apiTo }),
    []
  );
  const { previousTotal: previousPlatformRevenue, loadingPrevious: loadingPreviousRevenue } = usePreviousTotal(
    fetchPreviousPlatformRevenue,
    previousRange,
    [],
    prevPlatformRevKey
  );

  const fetchPreviousMembershipRevenue = useCallback(
    (range) =>
      membershipAdminApi
        .getMembershipStats({ from: range.apiFrom, to: range.apiTo })
        .then((res) => Number(res?.totalRevenue ?? 0)),
    []
  );
  const { previousTotal: previousMembershipRevenue, loadingPrevious: loadingPreviousMembershipRevenue } =
    usePreviousTotal(fetchPreviousMembershipRevenue, previousRange, [], prevMembershipRevKey);

  const initialDash = cache?.read(dashSummaryKey)?.data || null;
  const initialMembershipStats = cache?.read(membershipStatsKey)?.data ?? null;
  const initialPlans = cache?.read(PLANS_CACHE_KEY)?.data ?? null;

  const [loading, setLoading] = useState(() => !initialDash);
  const [dashboardData, setDashboardData] = useState(
    () => (initialDash ? { ...DEFAULT_DASHBOARD, ...initialDash } : DEFAULT_DASHBOARD)
  );

  const [membershipStats, setMembershipStats] = useState(() => initialMembershipStats);
  const [membershipLoading, setMembershipLoading] = useState(() => !initialMembershipStats);
  const membershipSeqRef = useRef(0);

  // Số thành viên đang hoạt động theo hạng (Bạc/Vàng/Kim cương) - số hiện tại, không theo khoảng thời gian lọc
  const [tierPlans, setTierPlans] = useState(() => initialPlans);
  const [tierCountsLoading, setTierCountsLoading] = useState(() => !initialPlans);
  const [dashboardError, setDashboardError] = useState('');

  const dashSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDashboardSummary = useCallback(async ({ force = false } = {}) => {
    if (dateError) {
      setLoading(false);
      return;
    }

    const cachedEntry = cache?.read(dashSummaryKey) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, DASHBOARD_STALE_TIME_MS)) {
      setDashboardData({ ...DEFAULT_DASHBOARD, ...cachedEntry.data });
      setDashboardError('');
      setLoading(false);
      return;
    }

    const reqId = ++dashSeqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setDashboardData({ ...DEFAULT_DASHBOARD, ...cachedEntry.data });
      setDashboardError('');
      setLoading(false);
    } else {
      setLoading(true);
      setDashboardError('');
    }

    try {
      const dashRes = await adminApi.getDashboard({
        from: activeRange.apiFrom,
        to: activeRange.apiTo,
      });
      if (!mountedRef.current || reqId !== dashSeqRef.current) return;
      if (dashRes) {
        const merged = { ...DEFAULT_DASHBOARD, ...dashRes };
        cache?.write(dashSummaryKey, merged);
        setDashboardData(merged);
      }
    } catch (err) {
      if (mountedRef.current && reqId === dashSeqRef.current) {
        console.error('Lỗi tải dữ liệu dashboard:', err);
        if (!hasCached || force) {
          setDashboardError(
            err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu doanh thu từ máy chủ.'
          );
        }
      }
    } finally {
      if (mountedRef.current && reqId === dashSeqRef.current) {
        setLoading(false);
      }
    }
  }, [cache, dashSummaryKey, activeRange.apiFrom, activeRange.apiTo, dateError]);

  useEffect(() => {
    loadDashboardSummary();
  }, [loadDashboardSummary]);

  // Tóm tắt gói thành viên & voucher cho tab Doanh thu (xem chi tiết đầy đủ ở trang Danh sách thành viên)
  useEffect(() => {
    if (dateError) {
      setMembershipLoading(false);
      return;
    }

    const cachedEntry = cache?.read(membershipStatsKey) || null;
    if (cachedEntry && cache.isFresh(cachedEntry, DASHBOARD_STALE_TIME_MS)) {
      setMembershipStats(cachedEntry.data);
      setMembershipLoading(false);
      return;
    }

    const reqId = ++membershipSeqRef.current;
    const hasCached = Boolean(cachedEntry);
    if (hasCached) {
      setMembershipStats(cachedEntry.data);
      setMembershipLoading(false);
    } else {
      setMembershipLoading(true);
    }

    const loadMembershipStats = async () => {
      try {
        const res = await membershipAdminApi.getMembershipStats({
          from: activeRange.apiFrom,
          to: activeRange.apiTo,
        });
        if (!mountedRef.current || reqId !== membershipSeqRef.current) return;
        const normalized = res || {};
        cache?.write(membershipStatsKey, normalized);
        setMembershipStats(normalized);
      } catch (err) {
        if (mountedRef.current && reqId === membershipSeqRef.current) {
          console.error('Lỗi tải thống kê gói thành viên:', err);
          if (!hasCached) {
            setMembershipStats(null);
          }
        }
      } finally {
        if (mountedRef.current && reqId === membershipSeqRef.current) {
          setMembershipLoading(false);
        }
      }
    };
    loadMembershipStats();
  }, [cache, membershipStatsKey, activeRange.apiFrom, activeRange.apiTo, dateError]);

  useEffect(() => {
    const cachedEntry = cache?.read(PLANS_CACHE_KEY) || null;
    if (cachedEntry && cache.isFresh(cachedEntry, STATIC_STALE_TIME_MS)) {
      setTierPlans(Array.isArray(cachedEntry.data) ? cachedEntry.data : []);
      setTierCountsLoading(false);
      return;
    }

    let cancelled = false;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setTierPlans(Array.isArray(cachedEntry.data) ? cachedEntry.data : []);
      setTierCountsLoading(false);
    } else {
      setTierCountsLoading(true);
    }

    const loadTierCounts = async () => {
      try {
        const plans = await membershipAdminApi.getPlans();
        if (cancelled || !mountedRef.current) return;
        const list = Array.isArray(plans) ? plans : [];
        cache?.write(PLANS_CACHE_KEY, list);
        setTierPlans(list);
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          console.error('Lỗi tải số thành viên theo hạng:', err);
          if (!hasCached) {
            setTierPlans(null);
          }
        }
      } finally {
        if (!cancelled && mountedRef.current) setTierCountsLoading(false);
      }
    };
    loadTierCounts();
    return () => {
      cancelled = true;
    };
  }, [cache]);

  const tierCounts = useMemo(() => {
    if (!Array.isArray(tierPlans)) return null;
    const counts = {};
    for (const tier of PAID_TIERS) {
      const plan = tierPlans.find((p) => p.tier === tier);
      counts[tier] = Number(plan?.activeSubscriberCount ?? 0);
    }
    return counts;
  }, [tierPlans]);

  const membershipRevenue = Number(membershipStats?.totalRevenue ?? 0);
  const tierSegments = PAID_TIERS.map((tier) => ({
    key: tier,
    label: TIER_SHORT_LABELS[tier] || tier,
    value: tierCounts?.[tier] ?? 0,
    color: TIER_HEX_COLOR[tier],
  }));
  const totalTierMembers = tierSegments.reduce((sum, s) => sum + s.value, 0);

  const revenueMetrics = [
    {
      label: 'Doanh thu nền tảng',
      value: dashboardData.platformRevenue || 0,
      description: 'Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù',
      icon: 'trending_up',
      iconBox: DASHBOARD_TONES.primary.iconBox,
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
      iconBox: DASHBOARD_TONES.warning.iconBox,
      badge: 'Số hiện tại',
      comparison: null,
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Tab Switcher + (tab Doanh thu) Bộ lọc thời gian & Xuất Excel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#DDE5D9] pb-4">
        <div
          className="inline-flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#DDE5D9] shadow-card"
          role="tablist"
          aria-label="Các mục tổng quan"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-[#006B2C] text-white shadow-sm'
                  : 'text-[#5B6776] hover:bg-[#F6F9F4] hover:text-[#006B2C]'
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
              className="px-4 py-2.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs font-semibold text-[#B42318]"
            >
              {dateError}
            </div>
          )}

          {dashboardError && !dateError && (
            <div
              role="alert"
              className="px-4 py-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs font-semibold text-[#B42318] flex items-center justify-between gap-3"
            >
              <span>{dashboardError}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadDashboardSummary({ force: true })}
              >
                Thử lại
              </Button>
            </div>
          )}

          {/* 2 thẻ: Doanh thu nền tảng & Tiền đang giữ hộ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {revenueMetrics.map((m, idx) => (
              <div
                key={m.label}
                className={`chart-fade-up ${DASHBOARD_CARD_CLASS} p-5 hover:-translate-y-0.5 flex flex-col justify-between`}
                style={{ '--i': idx }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]">
                      {m.badge}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl ${m.iconBox} flex items-center justify-center shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[21px]">{m.icon}</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#5B6776]">{m.label}</p>
                  <p className="text-2xl sm:text-3xl font-extrabold font-heading text-[#1F2A37] mt-1 tracking-tight">
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

                <p className="text-[11px] text-[#5B6776] mt-3 pt-2.5 border-t border-[#F6F9F4]">{m.description}</p>
              </div>
            ))}
          </div>

          {/* Tóm tắt gói thành viên: thẻ doanh thu nổi bật bên trái + biểu đồ tròn theo hạng bên phải */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`chart-fade-up ${DASHBOARD_CARD_CLASS} p-5 hover:-translate-y-0.5 flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]">
                    Theo khoảng thời gian đã chọn
                  </span>
                  <div className={`w-10 h-10 rounded-xl ${DASHBOARD_TONES.accent.iconBox} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[21px]">card_membership</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-[#5B6776]">Doanh thu gói thành viên</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading text-[#1F2A37] mt-1 tracking-tight">
                  {membershipLoading ? '...' : formatCurrencyVND(membershipRevenue)}
                </p>
                {previousPeriodLabel && !membershipLoading && (
                  <div className="mt-1.5">
                    <ComparisonBadge
                      current={membershipRevenue}
                      previous={previousMembershipRevenue}
                      loading={loadingPreviousMembershipRevenue}
                      label={previousPeriodLabel}
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#5B6776] mt-3 pt-2.5 border-t border-[#F6F9F4]">
                Tổng tiền thu được từ bán gói thành viên trong khoảng thời gian đã chọn.
              </p>
            </div>

            <div className={`${DASHBOARD_CARD_CLASS} p-6 flex flex-col`}>
              <h3 className="text-base font-bold text-[#1F2A37] font-heading">Gói thành viên</h3>

              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-2">
                <AdminDonutChart
                  segments={tierSegments}
                  centerValue={tierCountsLoading ? '...' : totalTierMembers}
                  centerLabel="Thành viên gói"
                  className="w-48 h-48 sm:w-52 sm:h-52"
                  ariaLabel="Biểu đồ thành viên theo hạng gói"
                />

                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                  {tierSegments.map((s) => (
                    <div
                      key={s.key}
                      className="rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] px-2 py-2.5 text-center"
                    >
                      <span className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#5B6776]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                        {s.label}
                      </span>
                      <span className="block mt-1 text-lg font-extrabold text-[#1F2A37] font-heading leading-none">
                        {tierCountsLoading ? '...' : s.value}
                      </span>
                      <span className="block mt-0.5 text-[11px] text-[#5B6776]">
                        {tierCountsLoading
                          ? '...'
                          : `${Math.round((s.value / Math.max(1, totalTierMembers)) * 100)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
