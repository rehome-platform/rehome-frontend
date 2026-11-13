import React, { useEffect, useState } from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import adminApi from '../services/adminApi.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import { PAID_TIERS, TIER_LABELS } from './membershipConstants.js';

function formatGrantError(err) {
  const status = err?.response?.status;
  const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
  if (backendMsg) return backendMsg;
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác tặng / gia hạn gói.';
  if (status === 404) return 'Không tìm thấy tài khoản hoặc gói thành viên phù hợp.';
  if (status === 409) return 'Trạng thái gói thành viên hiện tại không thể tặng / gia hạn (409).';
  return err?.message || 'Không thể tặng / gia hạn gói. Vui lòng thử lại.';
}

export default function GrantMembershipModal({ isOpen, onClose, onSuccess, initialMember = null }) {
  const toast = useToast();
  const [selectedMember, setSelectedMember] = useState(initialMember);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [tier, setTier] = useState(PAID_TIERS[0]);
  const [months, setMonths] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMember(initialMember || null);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    setHasSearched(false);
    setTier(PAID_TIERS[0]);
    setMonths('1');
    setReason('');
    setSubmitting(false);
    setError('');
  }, [isOpen, initialMember]);

  const handleSearchMembers = async () => {
    setSearching(true);
    setError('');
    try {
      const res = await adminApi.getAccounts({
        search: searchQuery.trim(),
        role: 'MEMBER',
        size: 10,
      });
      const list = Array.isArray(res) ? res : res?.content || [];
      setSearchResults(list);
      setHasSearched(true);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tìm kiếm thành viên.');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const accountId = selectedMember?.id ?? selectedMember?.accountId;
    if (!accountId) {
      setError('Vui lòng chọn thành viên.');
      return;
    }

    const parsedMonths = Number(months);
    if (!Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 24) {
      setError('Số tháng phải là số nguyên từ 1 đến 24.');
      return;
    }

    if (!reason.trim()) {
      setError('Vui lòng nhập lý do tặng / gia hạn.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await membershipAdminApi.grantSubscription({
        accountId,
        tier,
        durationMonths: parsedMonths,
        reason: reason.trim(),
      });
      toast.success('Đã tặng / gia hạn gói thành viên thành công.');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(formatGrantError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title="Tặng / gia hạn gói thành viên" size="md">
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {/* Member selector */}
        <div>
          <label className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Thành viên <span className="text-[#D92D20]">*</span>
          </label>
          {selectedMember ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]">
              <div>
                <p className="text-sm font-semibold text-[#191C19]">
                  {selectedMember.fullName || selectedMember.memberName || 'Thành viên'}
                </p>
                <p className="text-xs text-[#5B6776]">
                  {selectedMember.email || selectedMember.memberEmail || ''}
                  {selectedMember.memberCode ? ` • ${selectedMember.memberCode}` : ''}
                </p>
              </div>
              {!initialMember && (
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-xs font-medium text-[#006B2C] hover:underline"
                >
                  Đổi
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchMembers();
                    }
                  }}
                  placeholder="Tìm theo tên, email hoặc mã thành viên..."
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleSearchMembers} loading={searching}>
                  Tìm
                </Button>
              </div>
              {searchResults.length > 0 && (
                <ul className="max-h-40 overflow-y-auto border border-[#DDE5D9] rounded-xl divide-y divide-[#E2E8E0]">
                  {searchResults.map((acc) => (
                    <li key={acc.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedMember(acc)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F6F9F4] transition-colors"
                      >
                        <p className="text-sm font-medium text-[#191C19]">{acc.fullName || acc.email}</p>
                        <p className="text-xs text-[#5B6776]">
                          {acc.email} {acc.memberCode ? `• ${acc.memberCode}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {hasSearched && searchResults.length === 0 && !searching && (
                <p className="text-xs text-[#5B6776]">Không tìm thấy thành viên phù hợp.</p>
              )}
            </div>
          )}
        </div>

        {/* Tier select (PAID_TIERS only) */}
        <div>
          <label htmlFor="grant-tier" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Hạng gói <span className="text-[#D92D20]">*</span>
          </label>
          <select
            id="grant-tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
          >
            {PAID_TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>

        {/* Months input (1-24) */}
        <div>
          <label htmlFor="grant-months" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Số tháng (1–24) <span className="text-[#D92D20]">*</span>
          </label>
          <input
            id="grant-months"
            type="number"
            min={1}
            max={24}
            step={1}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
          />
        </div>

        {/* Reason textarea */}
        <div>
          <label htmlFor="grant-reason" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Lý do <span className="text-[#D92D20]">*</span>
          </label>
          <textarea
            id="grant-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do tặng hoặc gia hạn gói..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20] font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            Xác nhận tặng / gia hạn
          </Button>
        </div>
      </form>
    </Modal>
  );
}
