import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Spinner } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import GrantMembershipModal from './GrantMembershipModal.jsx';
import CancelMembershipModal from './CancelMembershipModal.jsx';
import TierBadge from './TierBadge.jsx';
import {
  TIER_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from './membershipConstants.js';
import {
  DEFAULT_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

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

export default function MembershipSubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();

  const detailCacheKey = id ? `admin:membership:sub-detail:${id}` : null;
  const initialCached = cache && detailCacheKey ? cache.read(detailCacheKey)?.data : null;

  const [detail, setDetail] = useState(() => initialCached ?? null);
  const [loading, setLoading] = useState(() => Boolean(id && !initialCached));
  const [error, setError] = useState('');
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDetail = useCallback(async ({ force = false } = {}) => {
    if (!id) return;
    const cachedEntry = cache && detailCacheKey ? cache.read(detailCacheKey) : null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, DEFAULT_STALE_TIME_MS)) {
      setDetail(cachedEntry.data);
      setError('');
      setLoading(false);
      return;
    }

    const reqId = ++seqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setDetail(cachedEntry.data);
      setError('');
      setLoading(false);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const res = await membershipAdminApi.getSubscriptionById(id);
      if (!mountedRef.current || reqId !== seqRef.current) return;
      if (cache && detailCacheKey) {
        cache.write(detailCacheKey, res);
      }
      setDetail(res);
    } catch (err) {
      if (!mountedRef.current || reqId !== seqRef.current) return;
      const status = err?.response?.status ?? err?.status;
      if (hasCached && [401, 403, 404].includes(status)) {
        cache?.evict(detailCacheKey);
        setDetail(null);
        setError(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết gói thành viên.');
      } else if (!hasCached || force) {
        setError(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết gói thành viên.');
      }
    } finally {
      if (mountedRef.current && reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, [cache, detailCacheKey, id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading && !detail) {
    return (
      <div className="p-6 bg-white rounded-xl border border-[#DDE5D9] text-sm text-[#5B6776] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span>Đang tải chi tiết gói thành viên...</span>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin/membership-subscriptions')} className="gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Quay lại danh sách</span>
        </Button>
        <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-sm text-[#D92D20]">
          {error}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const isTerminal = detail.status === 'CANCELLED' || detail.status === 'EXPIRED';
  const reasonText = detail.reason || detail.grantReason || detail.cancelReason || detail.note;
  const quotaUsage = detail.quotaUsage;
  const payments = Array.isArray(detail.payments) ? detail.payments : [];
  const vouchers = Array.isArray(detail.vouchers) ? detail.vouchers : [];

  const memberForGrant = detail.memberId
    ? {
        id: detail.memberId,
        fullName: detail.memberName,
        email: detail.memberEmail,
        memberCode: detail.memberCode,
        currentTier: detail.tier,
        currentStatus: detail.status,
        currentExpiresAt: detail.expiresAt,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-[#DDE5D9]">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/membership-subscriptions')} className="gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Quay lại</span>
          </Button>
          <div>
            <p className="text-xs text-[#5B6776]">
              {detail.memberName || '-'} • {detail.memberEmail || '-'}
              {detail.memberCode ? ` (${detail.memberCode})` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setIsGrantOpen(true)} className="gap-1.5">
            <span className="material-symbols-outlined text-base">card_giftcard</span>
            <span>Gia hạn / tặng thêm</span>
          </Button>
          <Button variant="danger" onClick={() => setIsCancelOpen(true)} disabled={isTerminal} className="gap-1.5">
            <span className="material-symbols-outlined text-base">cancel</span>
            <span>Hủy gói</span>
          </Button>
        </div>
      </div>

      {/* Thông tin gói */}
      <section className="bg-white p-5 rounded-xl border border-[#DDE5D9] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1F2A37]">Thông tin gói</h3>
          <Badge variant={STATUS_VARIANTS[detail.status] || 'default'}>
            {SUBSCRIPTION_STATUS_LABELS[detail.status] || detail.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#5B6776]">Thành viên</p>
            <p className="font-semibold text-[#1F2A37] mt-0.5">{detail.memberName || '-'}</p>
            <p className="text-xs text-[#5B6776]">{detail.memberEmail || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Hạng gói</p>
            <p className="mt-0.5">
              <TierBadge tier={detail.tier} label={detail.tierName || TIER_LABELS[detail.tier] || detail.tier} />
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Chu kỳ</p>
            <p className="font-medium text-[#1F2A37] mt-0.5">
              {BILLING_CYCLE_LABELS[detail.billingCycle] || detail.billingCycle || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Giá đã trả</p>
            <p className="font-semibold text-[#1F2A37] mt-0.5">{formatCurrencyVND(detail.pricePaid)}</p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Bắt đầu</p>
            <p className="font-medium text-[#1F2A37] mt-0.5">{formatDateTime(detail.startedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Hết hạn</p>
            <p className="font-medium text-[#1F2A37] mt-0.5">{formatDateTime(detail.expiresAt)}</p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Nguồn</p>
            <p className="font-medium text-[#1F2A37] mt-0.5">
              {detail.grantedByAdmin ? 'Admin tặng' : 'Tự mua'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Còn lại</p>
            <p className="font-medium text-[#1F2A37] mt-0.5">
              {detail.daysRemaining !== null && detail.daysRemaining !== undefined
                ? `${detail.daysRemaining} ngày`
                : '-'}
            </p>
          </div>
        </div>

        {reasonText && (
          <div className="p-3 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-sm">
            <span className="text-xs font-semibold text-[#5B6776]">Lý do: </span>
            <span className="text-[#1F2A37]">{reasonText}</span>
          </div>
        )}
      </section>

      {/* Hạn mức đã dùng trên mobile & Lịch sử thanh toán */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-[#DDE5D9] space-y-3">
          <h3 className="text-base font-bold text-[#1F2A37]">Hạn mức đã dùng trên mobile</h3>
          {quotaUsage ? (
            <dl className="divide-y divide-[#DDE5D9] text-sm">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Thử đồ ảo hôm nay</dt>
                <dd className="font-semibold text-[#1F2A37]">{quotaUsage.liveTryonUsedToday ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Phối đồ hôm nay</dt>
                <dd className="font-semibold text-[#1F2A37]">{quotaUsage.aiTryonUsedToday ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Tin nổi bật</dt>
                <dd className="font-semibold text-[#1F2A37]">
                  {typeof quotaUsage.featuredListing === 'boolean'
                    ? quotaUsage.featuredListing
                      ? 'Đang bật'
                      : 'Chưa bật'
                    : quotaUsage.featuredListing ?? '-'}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Số sản phẩm nổi bật</dt>
                <dd className="font-semibold text-[#1F2A37]">{quotaUsage.featuredProductCount ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Phiếu ký gửi chờ duyệt</dt>
                <dd className="font-semibold text-[#1F2A37]">{quotaUsage.pendingConsignmentForms ?? 0}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[#5B6776] bg-[#F6F9F4] p-3 rounded-xl border border-[#DDE5D9]">
              Chưa có dữ liệu sử dụng hạn mức trên mobile.
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE5D9] space-y-3">
          <h3 className="text-base font-bold text-[#1F2A37]">Lịch sử thanh toán</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-[#5B6776]">Chưa có giao dịch thanh toán.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#DDE5D9] text-xs text-[#5B6776]">
                    <th className="py-2 pr-3 whitespace-nowrap">Mã GD</th>
                    <th className="py-2 pr-3 whitespace-nowrap">Phương thức</th>
                    <th className="py-2 pr-3 text-right whitespace-nowrap">Số tiền</th>
                    <th className="py-2 pr-3 whitespace-nowrap">Trạng thái</th>
                    <th className="py-2 whitespace-nowrap">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE5D9]">
                  {payments.map((p, idx) => (
                    <tr key={p.id || idx}>
                      <td className="py-2 pr-3 font-mono text-xs">{p.transactionNo || p.paymentNo || '-'}</td>
                      <td className="py-2 pr-3">{PAYMENT_METHOD_LABELS[p.method] || p.method || '-'}</td>
                      <td className="py-2 pr-3 text-right font-medium">{formatCurrencyVND(p.amount)}</td>
                      <td className="py-2 pr-3">{p.status || '-'}</td>
                      <td className="py-2 whitespace-nowrap text-xs">{formatDateTime(p.paidAt || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Voucher đã nhận */}
      <section className="bg-white p-5 rounded-xl border border-[#DDE5D9] space-y-3">
        <h3 className="text-base font-bold text-[#1F2A37]">Voucher đã nhận</h3>
        {vouchers.length === 0 ? (
          <p className="text-sm text-[#5B6776]">Chưa có voucher được cấp.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#DDE5D9] text-xs text-[#5B6776]">
                  <th className="py-2 pr-3 whitespace-nowrap">Mã voucher</th>
                  <th className="py-2 pr-3 whitespace-nowrap">Tên voucher</th>
                  <th className="py-2 pr-3 whitespace-nowrap">Trạng thái</th>
                  <th className="py-2 whitespace-nowrap">Đơn hàng đã dùng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {vouchers.map((v, idx) => {
                  const orderNos = Array.isArray(v.usedOrderNos)
                    ? v.usedOrderNos.join(', ')
                    : v.usedOrderNos || '-';
                  return (
                    <tr key={v.id || v.code || idx}>
                      <td className="py-2 pr-3 font-mono text-xs font-semibold">{v.code}</td>
                      <td className="py-2 pr-3">{v.name || v.title || '-'}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={v.status === 'USED' ? 'success' : 'default'} size="sm">
                          {v.status || '-'}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs">{orderNos || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <GrantMembershipModal
        isOpen={isGrantOpen}
        onClose={() => setIsGrantOpen(false)}
        onSuccess={() => {
          cacheActions?.invalidate([
            'admin:membership:',
            'admin:dashboard:membership-stats:',
            'admin:dashboard:summary:',
            'admin:audit-logs:',
          ]);
          fetchDetail({ force: true });
        }}
        member={memberForGrant}
      />

      <CancelMembershipModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSuccess={() => {
          cacheActions?.invalidate([
            'admin:membership:',
            'admin:dashboard:membership-stats:',
            'admin:dashboard:summary:',
            'admin:audit-logs:',
          ]);
          fetchDetail({ force: true });
        }}
        subscription={detail}
      />
    </div>
  );
}
