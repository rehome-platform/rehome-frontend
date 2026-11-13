import React, { useEffect, useState } from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import membershipAdminApi from '../services/membershipAdminApi.js';
import { TIER_LABELS } from './membershipConstants.js';

export default function CancelMembershipModal({ isOpen, onClose, onSuccess, subscription }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setConfirmed(false);
    setSubmitting(false);
    setError('');
  }, [isOpen]);

  const canSubmit = Boolean(reason.trim()) && confirmed && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !subscription?.id) return;

    setSubmitting(true);
    setError('');
    try {
      await membershipAdminApi.cancelSubscription(subscription.id, reason.trim());
      toast.success('Đã hủy gói thành viên thành công.');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể hủy gói thành viên.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="Hủy gói thành viên" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {subscription && (
          <div className="p-3 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-sm text-[#1F2A37]">
            <p className="font-semibold">{subscription.memberName || subscription.memberEmail || 'Thành viên'}</p>
            <p className="text-xs text-[#5B6776] mt-0.5">
              Gói hiện tại: {subscription.tierName || TIER_LABELS[subscription.tier] || subscription.tier}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="cancel-reason" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Lý do hủy gói <span className="text-[#D92D20]">*</span>
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy gói thành viên..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D92D20]/20 focus:border-[#D92D20]"
          />
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#DDE5D9] bg-[#FFFDF7] cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#DDE5D9] text-[#D92D20] focus:ring-[#D92D20]"
          />
          <span className="text-xs text-[#1F2A37] font-medium leading-relaxed">
            Xác nhận hủy gói: không tự hoàn tiền; các voucher đã cấp vẫn giữ hiệu lực.
          </span>
        </label>

        {error && (
          <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20] font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Đóng
          </Button>
          <Button type="submit" variant="danger" loading={submitting} disabled={!canSubmit}>
            Xác nhận hủy gói
          </Button>
        </div>
      </form>
    </Modal>
  );
}
