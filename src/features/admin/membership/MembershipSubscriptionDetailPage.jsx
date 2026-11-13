import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import GrantMembershipModal from './GrantMembershipModal.jsx';
import CancelMembershipModal from './CancelMembershipModal.jsx';
import {
  TIER_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatQuotaValue,
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

const EFFECTIVE_LIMIT_LABELS = {
  maxActiveListings: 'Tin đăng hoạt động tối đa',
  commissionDiscountPercent: 'Giảm phí hoa hồng (%)',
  commissionFeeDiscountPercent: 'Giảm phí hoa hồng (%)',
  liveTryonDailyLimit: 'Live try-on / ngày',
  dailyLiveTryonLimit: 'Live try-on / ngày',
  liveTryonMonthlyLimit: 'Live try-on / tháng',
  monthlyLiveTryonLimit: 'Live try-on / tháng',
  aiTryonDailyLimit: 'AI try-on / ngày',
  dailyAiTryonLimit: 'AI try-on / ngày',
  aiTryonMonthlyLimit: 'AI try-on / tháng',
  monthlyAiTryonLimit: 'AI try-on / tháng',
  featuredListingQuota: 'Số tin nổi bật',
  maxFeaturedListings: 'Số tin nổi bật tối đa',
  maxPendingConsignmentForms: 'Phiếu ký gửi chờ duyệt tối đa',
  monthlyVoucherCount: 'Số voucher cấp mỗi tháng',
};

function formatLimitDisplay(val) {
  if (typeof val === 'boolean') return val ? 'Có' : 'Không';
  return formatQuotaValue(val);
}

export default function MembershipSubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await membershipAdminApi.getSubscriptionById(id);
      setDetail(res);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết gói thành viên.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading && !detail) {
    return (
      <div className="p-6 bg-white rounded-xl border border-[#E2E8E0] text-sm text-[#5B6776]">
        Đang tải chi tiết gói thành viên VIP...
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin/membership-subscriptions')}>
          Quay lại danh sách
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
  const effectiveLimits = detail.effectiveLimits;
  const quotaUsage = detail.quotaUsage;
  const payments = Array.isArray(detail.payments) ? detail.payments : [];
  const vouchers = Array.isArray(detail.vouchers) ? detail.vouchers : [];

  const initialMember = detail.memberId
    ? {
        id: detail.memberId,
        fullName: detail.memberName,
        email: detail.memberEmail,
        memberCode: detail.memberCode,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-[#E2E8E0]">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/membership-subscriptions')}>
            Quay lại
          </Button>
          <div>
            <h2 className="text-lg font-bold text-[#191C19]">Chi tiết gói thành viên VIP</h2>
            <p className="text-xs text-[#5B6776]">
              {detail.memberName || '-'} • {detail.memberEmail || '-'}
              {detail.memberCode ? ` (${detail.memberCode})` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setIsGrantOpen(true)}>
            Gia hạn / tặng thêm
          </Button>
          <Button variant="danger" onClick={() => setIsCancelOpen(true)} disabled={isTerminal}>
            Hủy gói
          </Button>
        </div>
      </div>

      {/* Block 1: Thông tin gói */}
      <section className="bg-white p-5 rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#191C19]">1. Thông tin gói</h3>
          <Badge variant={STATUS_VARIANTS[detail.status] || 'default'}>
            {SUBSCRIPTION_STATUS_LABELS[detail.status] || detail.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#5B6776]">Thành viên</p>
            <p className="font-semibold text-[#191C19] mt-0.5">{detail.memberName || '-'}</p>
            <p className="text-xs text-[#5B6776]">{detail.memberEmail || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-[#5B6776]">Hạng gói</p>
            <p className="font-semibold text-[#191C19] mt-0.5">
              {detail.tierName || TIER_LABELS[detail.tier] || detail.tier}
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
            <p className="font-semibold text-[#191C19] mt-0.5">{formatCurrencyVND(detail.pricePaid)}</p>
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

      {/* Block 2: Snapshot hạn mức & Hạn mức đã dùng trên mobile */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0] space-y-3">
          <h3 className="text-base font-bold text-[#191C19]">2a. Snapshot hạn mức gói</h3>
          {effectiveLimits && typeof effectiveLimits === 'object' ? (
            <dl className="divide-y divide-[#E2E8E0] text-sm">
              {Object.entries(effectiveLimits).map(([key, val]) => (
                <div key={key} className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-[#5B6776]">{EFFECTIVE_LIMIT_LABELS[key] || key}</dt>
                  <dd className="font-semibold text-[#191C19]">{formatLimitDisplay(val)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-[#5B6776] bg-[#F6F9F4] p-3 rounded-xl border border-[#DDE5D9]">
              Chưa có dữ liệu snapshot hạn mức từ backend
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0] space-y-3">
          <h3 className="text-base font-bold text-[#191C19]">2b. Hạn mức đã dùng trên mobile</h3>
          {quotaUsage ? (
            <dl className="divide-y divide-[#E2E8E0] text-sm">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Live try-on hôm nay</dt>
                <dd className="font-semibold text-[#191C19]">{quotaUsage.liveTryonUsedToday ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Live try-on tháng này</dt>
                <dd className="font-semibold text-[#191C19]">{quotaUsage.liveTryonUsedThisMonth ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">AI try-on hôm nay</dt>
                <dd className="font-semibold text-[#191C19]">{quotaUsage.aiTryonUsedToday ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">AI try-on tháng này</dt>
                <dd className="font-semibold text-[#191C19]">{quotaUsage.aiTryonUsedThisMonth ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Tin nổi bật</dt>
                <dd className="font-semibold text-[#191C19]">
                  {typeof quotaUsage.featuredListing === 'boolean'
                    ? quotaUsage.featuredListing
                      ? 'Đang bật'
                      : 'Chưa bật'
                    : quotaUsage.featuredListing ?? '-'}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Số sản phẩm nổi bật</dt>
                <dd className="font-semibold text-[#191C19]">{quotaUsage.featuredProductCount ?? 0}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-[#5B6776]">Phiếu ký gửi chờ duyệt</dt>
                <dd className="font-semibold text-[#191C19]">{quotaUsage.pendingConsignmentForms ?? 0}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[#5B6776] bg-[#F6F9F4] p-3 rounded-xl border border-[#DDE5D9]">
              Chưa có dữ liệu sử dụng hạn mức trên mobile.
            </p>
          )}
        </div>
      </section>

      {/* Block 3: Lịch sử thanh toán & Voucher đã nhận */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0] space-y-3">
          <h3 className="text-base font-bold text-[#191C19]">3a. Lịch sử thanh toán</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-[#5B6776]">Chưa có giao dịch thanh toán.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8E0] text-xs text-[#5B6776]">
                    <th className="py-2 pr-3">Mã GD</th>
                    <th className="py-2 pr-3">Phương thức</th>
                    <th className="py-2 pr-3 text-right">Số tiền</th>
                    <th className="py-2 pr-3">Trạng thái</th>
                    <th className="py-2">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E0]">
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

        <div className="bg-white p-5 rounded-xl border border-[#E2E8E0] space-y-3">
          <h3 className="text-base font-bold text-[#191C19]">3b. Voucher đã nhận</h3>
          {vouchers.length === 0 ? (
            <p className="text-sm text-[#5B6776]">Chưa có voucher được cấp.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8E0] text-xs text-[#5B6776]">
                    <th className="py-2 pr-3">Mã voucher</th>
                    <th className="py-2 pr-3">Tên voucher</th>
                    <th className="py-2 pr-3">Trạng thái</th>
                    <th className="py-2">Đơn hàng đã dùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E0]">
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
        </div>
      </section>

      <GrantMembershipModal
        isOpen={isGrantOpen}
        onClose={() => setIsGrantOpen(false)}
        onSuccess={fetchDetail}
        initialMember={initialMember}
      />

      <CancelMembershipModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSuccess={fetchDetail}
        subscription={detail}
      />
    </div>
  );
}
