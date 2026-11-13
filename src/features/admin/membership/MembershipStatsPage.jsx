import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import { getDefaultGrowthRange, validateDateRange } from '../utils/adminDateUtils.js';
import { TIER_LABELS } from './membershipConstants.js';

const AI_COST_STORAGE_KEY = 'rehome_admin_estimated_ai_cost';

function readStoredAiCost() {
  try {
    return localStorage.getItem(AI_COST_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function parseNonNegativeNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function normalizeRevenueByTier(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      tier: item.tier || item.name || 'UNKNOWN',
      revenue: Number(item.revenue ?? item.amount ?? 0),
      count: item.count ?? item.purchases ?? null,
    }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([tier, val]) => ({
      tier,
      revenue: Number(typeof val === 'object' ? val?.revenue ?? val?.amount ?? 0 : val ?? 0),
      count: typeof val === 'object' ? val?.count ?? null : null,
    }));
  }
  return [];
}

function normalizeRevenueByMonth(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      month: item.month || item.period || '-',
      revenue: Number(item.revenue ?? item.totalRevenue ?? item.amount ?? 0),
    }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([month, val]) => ({
      month,
      revenue: Number(typeof val === 'object' ? val?.revenue ?? val?.amount ?? 0 : val ?? 0),
    }));
  }
  return [];
}

export default function MembershipStatsPage() {
  const defaultRange = getDefaultGrowthRange(30);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [dateError, setDateError] = useState(null);

  const [membershipStats, setMembershipStats] = useState(null);
  const [voucherStats, setVoucherStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [aiCostInput, setAiCostInput] = useState(() => readStoredAiCost());
  const seqRef = useRef(0);

  const fetchStats = useCallback(async (rangeFrom, rangeTo) => {
    const validationError = validateDateRange(rangeFrom, rangeTo);
    setDateError(validationError);
    if (validationError) {
      setLoading(false);
      return;
    }

    const reqId = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const [mStats, vStats] = await Promise.all([
        membershipAdminApi.getMembershipStats({ from: rangeFrom, to: rangeTo }),
        membershipAdminApi.getVoucherStats({ from: rangeFrom, to: rangeTo }),
      ]);
      if (reqId !== seqRef.current) return;
      setMembershipStats(mStats || {});
      setVoucherStats(vStats || {});
    } catch (err) {
      if (reqId !== seqRef.current) return;
      setError(err?.response?.data?.message || err?.message || 'Không thể tải thống kê gói VIP & Voucher.');
    } finally {
      if (reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStats(from, to);
  }, [fetchStats, from, to]);

  const handleAiCostChange = (e) => {
    const nextVal = e.target.value;
    setAiCostInput(nextVal);
    try {
      if (nextVal.trim() === '') {
        localStorage.removeItem(AI_COST_STORAGE_KEY);
      } else {
        localStorage.setItem(AI_COST_STORAGE_KEY, nextVal);
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  };

  const activeVipCount =
    membershipStats?.activeVipCount ?? membershipStats?.activeSubscriptions ?? membershipStats?.activeCount ?? 0;
  const newPurchases =
    membershipStats?.newPurchases ?? membershipStats?.newSubscriptions ?? membershipStats?.purchasedCount ?? 0;
  const nonRenewals =
    membershipStats?.nonRenewals ??
    membershipStats?.churnedCount ??
    membershipStats?.expiredWithoutRenewal ??
    0;

  const revenueByTier = normalizeRevenueByTier(membershipStats?.revenueByTier);
  const revenueByMonth = normalizeRevenueByMonth(membershipStats?.revenueByMonth);
  const totalRevenue = Number(
    membershipStats?.totalRevenue ??
      revenueByTier.reduce((sum, item) => sum + item.revenue, 0)
  );

  const templates = Array.isArray(voucherStats?.byTemplate) ? voucherStats.byTemplate : [];
  const voucherTotalSpent =
    voucherStats?.totalSpent !== undefined && voucherStats?.totalSpent !== null
      ? Number(voucherStats.totalSpent)
      : null;

  const parsedAiCost = parseNonNegativeNumber(aiCostInput);
  const hasCompleteCostData = parsedAiCost !== null && voucherTotalSpent !== null;
  const totalCost = hasCompleteCostData ? voucherTotalSpent + parsedAiCost : null;
  const netProfit = hasCompleteCostData ? totalRevenue - totalCost : null;

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#191C19] font-heading">
              Thống kê gói VIP &amp; Voucher
            </h2>
            <p className="text-xs text-[#717971] mt-0.5">
              Theo dõi tăng trưởng thành viên VIP, doanh thu thanh toán thành công và chi phí voucher nền tảng (múi giờ +07:00).
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="stats-from-date" className="block text-xs font-medium text-[#5B6776] mb-1">
                Từ ngày
              </label>
              <input
                id="stats-from-date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-[#E2E8E0] text-[#191C19] focus:outline-none focus:border-[#006B2C]"
              />
            </div>
            <div>
              <label htmlFor="stats-to-date" className="block text-xs font-medium text-[#5B6776] mb-1">
                Đến ngày
              </label>
              <input
                id="stats-to-date"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-[#E2E8E0] text-[#191C19] focus:outline-none focus:border-[#006B2C]"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => fetchStats(from, to)}
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        {dateError && (
          <div role="alert" className="p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
            {dateError}
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
            {error}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0]">
          <p className="text-xs font-medium text-[#717971]">VIP đang hoạt động</p>
          <p className="text-2xl font-bold text-[#191C19] mt-1 tabular-nums">{activeVipCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0]">
          <p className="text-xs font-medium text-[#717971]">Lượt mua mới</p>
          <p className="text-2xl font-bold text-[#006B2C] mt-1 tabular-nums">{newPurchases}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0]">
          <p className="text-xs font-medium text-[#717971]">Không gia hạn</p>
          <p className="text-2xl font-bold text-[#D97706] mt-1 tabular-nums">{nonRenewals}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0]">
          <p className="text-xs font-medium text-[#717971]">Doanh thu gói VIP (thành công)</p>
          <p className="text-2xl font-bold text-[#191C19] mt-1 tabular-nums">
            {formatCurrencyVND(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-3">
          <h3 className="text-sm font-bold text-[#191C19]">Doanh thu theo hạng gói</h3>
          {revenueByTier.length === 0 ? (
            <p className="text-xs text-[#717971]">Chưa có dữ liệu doanh thu theo hạng trong kỳ.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E2E8E0] text-xs text-[#717971]">
                <tr>
                  <th className="py-2">Hạng</th>
                  <th className="py-2 text-right">Số lượt</th>
                  <th className="py-2 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E0]">
                {revenueByTier.map((row) => (
                  <tr key={row.tier}>
                    <td className="py-2 font-medium text-[#191C19]">
                      {TIER_LABELS[row.tier] || row.tier}
                    </td>
                    <td className="py-2 text-right text-[#5B6776] tabular-nums">
                      {row.count ?? '—'}
                    </td>
                    <td className="py-2 text-right font-semibold text-[#191C19] tabular-nums">
                      {formatCurrencyVND(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-3">
          <h3 className="text-sm font-bold text-[#191C19]">Doanh thu theo tháng</h3>
          {revenueByMonth.length === 0 ? (
            <p className="text-xs text-[#717971]">Chưa có dữ liệu doanh thu theo tháng trong kỳ.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E2E8E0] text-xs text-[#717971]">
                <tr>
                  <th className="py-2">Tháng</th>
                  <th className="py-2 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E0]">
                {revenueByMonth.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2 font-medium text-[#191C19]">{row.month}</td>
                    <td className="py-2 text-right font-semibold text-[#191C19] tabular-nums">
                      {formatCurrencyVND(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Voucher Stats Table */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#191C19]">Thống kê Voucher theo mẫu</h3>
            <p className="text-xs text-[#717971]">
              Tổng tiền đã chi từ máy chủ:{' '}
              <strong className="text-[#191C19]">
                {voucherTotalSpent !== null ? formatCurrencyVND(voucherTotalSpent) : '— (Chưa có dữ liệu)'}
              </strong>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6F9F4] border-b border-[#E2E8E0] text-xs font-semibold text-[#5B6776]">
              <tr>
                <th className="py-2.5 px-3">Mẫu voucher</th>
                <th className="py-2.5 px-3 text-right">Đã phát</th>
                <th className="py-2.5 px-3 text-right">Đã dùng</th>
                <th className="py-2.5 px-3 text-right">Hết hạn</th>
                <th className="py-2.5 px-3 text-right">Tỷ lệ dùng</th>
                <th className="py-2.5 px-3 text-right">Tổng tiền đã chi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E0]">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-[#717971]">
                    Chưa có dữ liệu voucher trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => {
                  const issued = tpl.issued ?? tpl.issuedCount ?? 0;
                  const used = tpl.used ?? tpl.usedCount ?? 0;
                  const expired = tpl.expired ?? tpl.expiredCount ?? 0;
                  const usageRate =
                    tpl.usageRate !== undefined && tpl.usageRate !== null
                      ? `${Number(tpl.usageRate).toFixed(1)}%`
                      : issued > 0
                        ? `${((used / issued) * 100).toFixed(1)}%`
                        : '0%';
                  const hasSpent = tpl.spent !== undefined && tpl.spent !== null;

                  return (
                    <tr key={tpl.templateId || tpl.id || tpl.name}>
                      <td className="py-2.5 px-3 font-medium text-[#191C19]">
                        {tpl.name || tpl.templateName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{issued}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{used}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{expired}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{usageRate}</td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                        {hasSpent ? formatCurrencyVND(tpl.spent) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit / Loss Comparison with Estimated AI Cost */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#191C19]">
              Ước tính Lãi / Lỗ Gói VIP (Doanh thu vs Voucher + Chi phí AI)
            </h3>
            <p className="text-xs text-[#717971] mt-0.5">
              Chi phí AI ước tính chỉ lưu cục bộ trên trình duyệt để tham khảo, không ghi vào sổ quỹ nền tảng.
            </p>
          </div>

          <div className="w-full md:w-72">
            <label htmlFor="estimated-ai-cost" className="block text-xs font-semibold text-[#1F2A37] mb-1">
              Chi phí AI ước tính (VNĐ)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="estimated-ai-cost"
                type="number"
                min="0"
                step="1000"
                placeholder="Nhập số tiền (VNĐ)..."
                value={aiCostInput}
                onChange={handleAiCostChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8E0] text-[#191C19] focus:outline-none focus:border-[#006B2C]"
              />
              {aiCostInput !== '' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAiCostChange({ target: { value: '' } })}
                >
                  Xóa
                </Button>
              )}
            </div>
          </div>
        </div>

        {!hasCompleteCostData ? (
          <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] flex items-center justify-between">
            <span className="text-sm text-[#5B6776]">Kết quả so sánh lãi / lỗ:</span>
            <Badge variant="warning">Chưa đủ dữ liệu tính</Badge>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
              <p className="text-xs text-[#717971]">Tổng doanh thu gói VIP</p>
              <p className="text-base font-bold text-[#191C19] mt-1 tabular-nums">
                {formatCurrencyVND(totalRevenue)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
              <p className="text-xs text-[#717971]">Tổng chi phí (Voucher + AI)</p>
              <p className="text-base font-bold text-[#191C19] mt-1 tabular-nums">
                {formatCurrencyVND(totalCost)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
              <p className="text-xs text-[#717971]">Chênh lệch ròng</p>
              <p
                className={`text-base font-bold mt-1 tabular-nums ${
                  netProfit >= 0 ? 'text-[#006B2C]' : 'text-[#D92D20]'
                }`}
              >
                {formatCurrencyVND(netProfit)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
