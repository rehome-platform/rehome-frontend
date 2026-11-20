import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Spinner } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { useDebouncedSearch } from '../../../hooks/useDebouncedSearch.js';
import adminApi from '../services/adminApi.js';
import membershipAdminApi from '../services/membershipAdminApi.js';
import { PAID_TIERS, TIER_LABELS, SUBSCRIPTION_STATUS_LABELS } from './membershipConstants.js';
import TierBadge from './TierBadge.jsx';

function formatGrantError(err) {
  const status = err?.response?.status;
  const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
  if (backendMsg) return backendMsg;
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác tặng / gia hạn gói.';
  if (status === 404) return 'Không tìm thấy tài khoản hoặc gói thành viên phù hợp.';
  if (status === 409) return 'Trạng thái gói thành viên hiện tại không thể tặng / gia hạn (409).';
  return err?.message || 'Không thể tặng / gia hạn gói. Vui lòng thử lại.';
}

/**
 * `member` truyền sẵn (mở từ trang Chi tiết thành viên) -> bỏ qua tìm kiếm, dùng luôn, đã kèm
 * thông tin gói hiện tại. Không truyền (mở từ trang Gói thành viên / Danh sách thành viên) -> hiện
 * ô tìm theo tên/email/mã, gõ tới đâu tìm tới đó; chọn xong tự tải gói hiện tại của người đó.
 */
export default function GrantMembershipModal({ isOpen, onClose, onSuccess, member = null, defaultTier = null }) {
  const toast = useToast();

  const [selectedMember, setSelectedMember] = useState(member);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    debouncedQuery: debouncedSearchQuery,
    isTooShort: isSearchTooShort,
    hint: searchHint,
  } = useDebouncedSearch(searchQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [planInfo, setPlanInfo] = useState(null); // { tier, status, expiresAt } | null | undefined (chưa tải)
  const [tier, setTier] = useState(defaultTier || PAID_TIERS[0]);
  const [months, setMonths] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchSeqRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMember(member);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    setHasSearched(false);
    setTier(defaultTier || PAID_TIERS[0]);
    setMonths('1');
    setReason('');
    setSubmitting(false);
    setError('');
  }, [isOpen, member, defaultTier]);

  // Member đã có sẵn currentTier (từ trang chi tiết) thì dùng luôn; chọn qua tìm kiếm thì tự tải
  useEffect(() => {
    if (!isOpen || !selectedMember) {
      setPlanInfo(null);
      return;
    }
    if (selectedMember.currentTier !== undefined) {
      setPlanInfo({
        tier: selectedMember.currentTier,
        status: selectedMember.currentStatus,
        expiresAt: selectedMember.currentExpiresAt,
      });
      return;
    }
    let cancelled = false;
    setPlanInfo(undefined);
    membershipAdminApi
      .getSubscriptions({ q: selectedMember.email || selectedMember.memberCode, size: 10 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : res?.content || [];
        const match = list.find((s) => s.memberId === selectedMember.id);
        setPlanInfo(match ? { tier: match.tier, status: match.status, expiresAt: match.expiresAt } : null);
      })
      .catch(() => {
        if (!cancelled) setPlanInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedMember]);

  // Gõ tới đâu tìm tới đó (debounce 400ms & tối thiểu 2 ký tự), tìm theo tài khoản Member - kể cả người chưa từng mua gói
  useEffect(() => {
    if (!isOpen || selectedMember) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    if (isSearchTooShort || !debouncedSearchQuery) {
      setSearching(false);
      return;
    }
    const seq = ++searchSeqRef.current;
    setSearching(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.getAccounts({ search: debouncedSearchQuery, role: 'MEMBER', size: 10 });
        if (cancelled || seq !== searchSeqRef.current) return;
        const list = Array.isArray(res) ? res : res?.content || [];
        setSearchResults(list);
        setHasSearched(true);
      } catch (err) {
        if (cancelled || seq !== searchSeqRef.current) return;
        setError(err?.response?.data?.message || err?.message || 'Không thể tìm kiếm thành viên.');
      } finally {
        if (!cancelled && seq === searchSeqRef.current) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, searchQuery, debouncedSearchQuery, isSearchTooShort, selectedMember]);

  if (!isOpen) {
    return null;
  }

  const hasCurrentPlan = Boolean(planInfo && planInfo.tier && planInfo.tier !== 'FREE');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!selectedMember) {
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
        memberId: selectedMember.id,
        tier,
        months: parsedMonths,
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
        {/* Member */}
        <div>
          <label className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Thành viên <span className="text-[#D92D20]">*</span>
          </label>
          {selectedMember ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]">
              <div>
                <p className="text-sm font-semibold text-[#1F2A37]">
                  {selectedMember.fullName || selectedMember.memberName || 'Thành viên'}
                </p>
                <p className="text-xs text-[#5B6776]">
                  {selectedMember.email || selectedMember.memberEmail || ''}
                  {selectedMember.memberCode ? ` • ${selectedMember.memberCode}` : ''}
                </p>
              </div>
              {!member && (
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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, email hoặc mã thành viên..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
              />
              {isSearchTooShort && (
                <p className="text-[11px] text-[#5f5f5f]">{searchHint}</p>
              )}
              {searching && (
                <div className="flex items-center gap-2 text-xs text-[#5B6776] py-1">
                  <Spinner size="sm" />
                  <span>Đang tìm...</span>
                </div>
              )}
              {!searching && searchResults.length > 0 && (
                <ul className="max-h-40 overflow-y-auto border border-[#DDE5D9] rounded-xl divide-y divide-[#DDE5D9]">
                  {searchResults.map((acc) => (
                    <li key={acc.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMember({
                            id: acc.accountId,
                            fullName: acc.fullName,
                            email: acc.email,
                            memberCode: acc.code,
                          })
                        }
                        className="w-full text-left px-3 py-2 hover:bg-[#F6F9F4] transition-colors"
                      >
                        <p className="text-sm font-medium text-[#1F2A37]">{acc.fullName || acc.email}</p>
                        <p className="text-xs text-[#5B6776]">
                          {acc.email} {acc.code ? `• ${acc.code}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && hasSearched && searchResults.length === 0 && (
                <p className="text-xs text-[#5B6776]">Không tìm thấy thành viên phù hợp.</p>
              )}
            </div>
          )}
        </div>

        {/* Gói hiện tại — để Admin thấy bối cảnh trước khi chọn hạng/số tháng mới */}
        {selectedMember && (
          <div>
            <p className="block text-xs font-semibold text-[#1F2A37] mb-1.5">Gói hiện tại</p>
            {planInfo === undefined ? (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#5B6776]">
                <Spinner size="sm" />
                <span>Đang tải...</span>
              </div>
            ) : hasCurrentPlan ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#DDE5D9] bg-white">
                <div className="flex items-center gap-2">
                  <TierBadge tier={planInfo.tier} label={TIER_LABELS[planInfo.tier] || planInfo.tier} />
                  {planInfo.status && (
                    <span className="text-xs text-[#5B6776]">
                      {SUBSCRIPTION_STATUS_LABELS[planInfo.status] || planInfo.status}
                    </span>
                  )}
                </div>
                {planInfo.expiresAt && (
                  <p className="text-xs text-[#5B6776] whitespace-nowrap">
                    Hết hạn: {new Date(planInfo.expiresAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#5B6776]">
                Chưa có gói trả phí nào — đang ở hạng {TIER_LABELS.FREE}.
              </div>
            )}
          </div>
        )}

        {/* Tier select (PAID_TIERS only) */}
        <div>
          <label htmlFor="grant-tier" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Hạng gói mới <span className="text-[#D92D20]">*</span>
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
          {hasCurrentPlan && (
            <p className="text-[11px] text-[#5B6776] mt-1">
              Chọn đúng hạng hiện tại để gia hạn thêm, hoặc hạng khác để đổi hạng.
            </p>
          )}
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
