import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDate } from '../../../utils/formatters.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import GrantMembershipModal from './GrantMembershipModal.jsx';
import {
  TIER_ORDER,
  TIER_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from './membershipConstants.js';

const BILLING_CYCLE_LABELS = {
  MONTHLY: 'Hàng tháng',
  QUARTERLY: 'Hàng quý',
  YEARLY: 'Hàng năm',
};

const STATUS_VARIANTS = {
  ACTIVE: 'success',
  EXPIRED: 'default',
  CANCELLED: 'danger',
  PENDING_PAYMENT: 'warning',
};

const PAGE_SIZE = 20;

export default function MembershipSubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tier = searchParams.get('tier') || '';
  const status = searchParams.get('status') || '';
  const q = searchParams.get('q') || '';
  const expiringInDays = searchParams.get('expiringInDays') || '';
  const rawPage = Number(searchParams.get('page') || 0);
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? rawPage : 0;

  const [searchInput, setSearchInput] = useState(q);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGrantOpen, setIsGrantOpen] = useState(false);

  const seqRef = useRef(0);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const fetchSubscriptions = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await membershipAdminApi.getSubscriptions({
        tier: tier || undefined,
        status: status || undefined,
        search: q || undefined,
        expiringInDays: expiringInDays ? Number(expiringInDays) : undefined,
        page,
        size: PAGE_SIZE,
      });
      if (seq !== seqRef.current) return;

      const list = Array.isArray(res) ? res : res?.content || [];
      setItems(list);
      setTotalPages(res?.totalPages ?? (list.length > 0 ? 1 : 0));
      setTotalElements(res?.totalElements ?? list.length);
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách thành viên VIP.');
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
      }
    }
  }, [tier, status, q, expiringInDays, page]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const updateParams = (updates, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, String(val));
      }
    });
    if (resetPage) {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() }, true);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="space-y-5">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-[#E2E8E0]">
        <div>
          <h2 className="text-lg font-bold text-[#191C19]">Danh sách thành viên VIP</h2>
          <p className="text-xs text-[#5B6776] mt-0.5">
            Quản lý gói thành viên, theo dõi hạn sử dụng và tặng / gia hạn gói VIP ({totalElements} bản ghi)
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsGrantOpen(true)}>
          Tặng / gia hạn gói
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8E0]">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label htmlFor="sub-search" className="block text-xs font-semibold text-[#1F2A37] mb-1">
              Tìm kiếm thành viên
            </label>
            <div className="flex gap-2">
              <input
                id="sub-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tên, email hoặc mã thành viên..."
                className="flex-1 px-3 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
              />
              <Button type="submit" variant="secondary" size="sm">
                Tìm
              </Button>
            </div>
          </div>

          <div>
            <label htmlFor="filter-tier" className="block text-xs font-semibold text-[#1F2A37] mb-1">
              Lọc theo hạng
            </label>
            <select
              id="filter-tier"
              aria-label="Lọc theo hạng"
              value={tier}
              onChange={(e) => updateParams({ tier: e.target.value }, true)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
            >
              <option value="">Tất cả hạng</option>
              {TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-xs font-semibold text-[#1F2A37] mb-1">
              Trạng thái
            </label>
            <select
              id="filter-status"
              aria-label="Lọc theo trạng thái"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value }, true)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="filter-expiring" className="block text-xs font-semibold text-[#1F2A37] mb-1">
                Sắp hết hạn
              </label>
              <select
                id="filter-expiring"
                aria-label="Lọc sắp hết hạn"
                value={expiringInDays}
                onChange={(e) => updateParams({ expiringInDays: e.target.value }, true)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
              >
                <option value="">Tất cả</option>
                <option value="3">Trong 3 ngày</option>
                <option value="7">Trong 7 ngày</option>
                <option value="30">Trong 30 ngày</option>
              </select>
            </div>
            {(tier || status || q || expiringInDays) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters}>
                Xóa lọc
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F9F4] border-b border-[#E2E8E0] text-xs font-semibold text-[#5B6776]">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4">Hạng</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Chu kỳ</th>
                <th className="py-3 px-4 text-right">Giá đã trả</th>
                <th className="py-3 px-4">Bắt đầu</th>
                <th className="py-3 px-4">Hết hạn</th>
                <th className="py-3 px-4">Còn lại</th>
                <th className="py-3 px-4">Nguồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E0] text-sm text-[#1F2A37]">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-[#5B6776]">
                    Đang tải danh sách thành viên VIP...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-[#5B6776]">
                    Không có gói thành viên nào phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const hasDays = item.daysRemaining !== null && item.daysRemaining !== undefined;
                  const isExpiringSoon = hasDays && Number(item.daysRemaining) <= 3;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/admin/membership-subscriptions/${item.id}`)}
                      className="hover:bg-[#F6F9F4] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#191C19]">{item.memberName || '-'}</p>
                        <p className="text-xs text-[#5B6776]">{item.memberEmail || '-'}</p>
                        {item.memberCode && (
                          <p className="text-[11px] font-mono text-[#5B6776]">{item.memberCode}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {item.tierName || TIER_LABELS[item.tier] || item.tier}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANTS[item.status] || 'default'} size="sm">
                          {SUBSCRIPTION_STATUS_LABELS[item.status] || item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {BILLING_CYCLE_LABELS[item.billingCycle] || item.billingCycle || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums">
                        {formatCurrencyVND(item.pricePaid)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.startedAt)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.expiresAt)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasDays ? (
                          <Badge variant={isExpiringSoon ? 'danger' : 'default'} size="sm">
                            {item.daysRemaining} ngày
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={item.grantedByAdmin ? 'info' : 'default'} size="sm">
                          {item.grantedByAdmin ? 'Admin tặng' : 'Tự mua'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8E0] bg-[#F6F9F4]/50 text-xs text-[#5B6776]">
          <span>
            Trang {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 0 || loading}
              onClick={() => updateParams({ page: page - 1 }, false)}
            >
              Trang trước
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => updateParams({ page: page + 1 }, false)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </div>

      <GrantMembershipModal
        isOpen={isGrantOpen}
        onClose={() => setIsGrantOpen(false)}
        onSuccess={fetchSubscriptions}
      />
    </div>
  );
}
