import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import { validateDateRange } from '../utils/adminDateUtils.js';
import {
  PAID_TIERS,
  TIER_LABELS,
  PAYMENT_METHOD_LABELS,
} from './membershipConstants.js';

const PAGE_SIZE = 20;

const PAYMENT_STATUS_META = {
  PAID: { label: 'Đã thanh toán', variant: 'success' },
  SUCCESS: { label: 'Thành công', variant: 'success' },
  COMPLETED: { label: 'Hoàn tất', variant: 'success' },
  PENDING: { label: 'Chờ thanh toán', variant: 'warning' },
  FAILED: { label: 'Thất bại', variant: 'danger' },
  CANCELLED: { label: 'Đã hủy', variant: 'default' },
};

export default function MembershipPaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tier, setTier] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(0);

  const [dateError, setDateError] = useState(null);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingNotice, setPendingNotice] = useState(false);
  const [error, setError] = useState('');

  const seqRef = useRef(0);

  const fetchPayments = useCallback(async () => {
    const validationError = validateDateRange(from, to);
    setDateError(validationError);
    if (validationError) {
      setLoading(false);
      return;
    }

    const reqId = ++seqRef.current;
    setLoading(true);
    setError('');
    setPendingNotice(false);

    try {
      const data = await membershipAdminApi.getPayments({
        from,
        to,
        tier,
        method,
        page,
        size: PAGE_SIZE,
      });
      if (reqId !== seqRef.current) return;

      const list = Array.isArray(data) ? data : data?.content || [];
      setItems(list);
      setTotalPages(data?.totalPages ?? 0);
    } catch (err) {
      if (reqId !== seqRef.current) return;
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        setPendingNotice(true);
        setItems([]);
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải lịch sử thanh toán gói VIP.'
        );
      }
    } finally {
      if (reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, [from, to, tier, method, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const handleResetFilters = () => {
    setFrom('');
    setTo('');
    setTier('');
    setMethod('');
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#191C19] font-heading">
              Lịch sử thanh toán gói VIP
            </h2>
            <p className="text-xs text-[#717971] mt-0.5">
              Tra cứu toàn bộ giao dịch thanh toán gói thành viên theo hạng, phương thức và thời gian.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={fetchPayments}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-[#E2E8E0]">
          <div>
            <label htmlFor="pay-from" className="block text-xs font-medium text-[#5B6776] mb-1">
              Từ ngày
            </label>
            <input
              id="pay-from"
              type="date"
              value={from}
              onChange={handleFilterChange(setFrom)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#E2E8E0] text-[#191C19]"
            />
          </div>

          <div>
            <label htmlFor="pay-to" className="block text-xs font-medium text-[#5B6776] mb-1">
              Đến ngày
            </label>
            <input
              id="pay-to"
              type="date"
              value={to}
              onChange={handleFilterChange(setTo)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#E2E8E0] text-[#191C19]"
            />
          </div>

          <div>
            <label htmlFor="pay-tier" className="block text-xs font-medium text-[#5B6776] mb-1">
              Hạng gói
            </label>
            <select
              id="pay-tier"
              value={tier}
              onChange={handleFilterChange(setTier)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#E2E8E0] bg-white text-[#191C19]"
            >
              <option value="">Tất cả hạng</option>
              {PAID_TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pay-method" className="block text-xs font-medium text-[#5B6776] mb-1">
              Phương thức
            </label>
            <select
              id="pay-method"
              value={method}
              onChange={handleFilterChange(setMethod)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#E2E8E0] bg-white text-[#191C19]"
            >
              <option value="">Tất cả phương thức</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {(from || to || tier || method) && (
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters}>
              Xóa lọc
            </Button>
          )}
        </div>

        {dateError && (
          <div role="alert" className="p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
            {dateError}
          </div>
        )}
      </div>

      {pendingNotice && (
        <div
          role="status"
          className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-sm text-[#92400E]"
        >
          Chức năng lịch sử thanh toán gói VIP đang chờ backend hoàn tất tích hợp endpoint{' '}
          <code className="font-mono font-semibold">/api/admin/membership-payments</code>.
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-sm text-[#D92D20]">
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
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Hạng</th>
                <th className="py-3 px-4 text-right">Số tiền thực</th>
                <th className="py-3 px-4">Phương thức</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4">Ngày thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E0] text-sm text-[#1F2A37]">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-[#5B6776]">
                    Đang tải lịch sử thanh toán...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-[#5B6776]">
                    Chưa có giao dịch thanh toán nào phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const statusMeta = PAYMENT_STATUS_META[item.status] || {
                    label: item.status || '—',
                    variant: 'default',
                  };

                  return (
                    <tr key={item.id} className="hover:bg-[#F6F9F4]/60">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#191C19]">{item.memberName || '—'}</p>
                        <p className="text-xs text-[#5B6776]">{item.memberEmail || '—'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {item.subscriptionId ? (
                          <Link
                            to={`/admin/membership-subscriptions/${item.subscriptionId}`}
                            className="text-[#006B2C] hover:underline font-semibold"
                          >
                            {item.subscriptionId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {TIER_LABELS[item.tier] || item.tier || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">
                        {formatCurrencyVND(item.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {PAYMENT_METHOD_LABELS[item.method] || item.method || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusMeta.variant} size="sm">
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-[#5B6776]">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-[#5B6776]">
                        {item.paidAt ? formatDateTime(item.paidAt) : '—'}
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
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trang trước
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
