import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { Modal, Button } from '../../../components/common/index.js';
import AdminAccountsView from '../components/AdminAccountsView.jsx';
import adminApi from '../services/adminApi.js';
import useAdminPeriod from '../hooks/useAdminPeriod.js';

const DISMISSED_PROPOSALS_STORAGE_KEY = 'rehome_admin_dismissed_ban_proposals';
const PAGE_SIZE = 50;

function getDismissedProposalIds() {
  try {
    const raw = localStorage.getItem(DISMISSED_PROPOSALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissedProposalIds(ids) {
  try {
    localStorage.setItem(DISMISSED_PROPOSALS_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

/**
 * Trang Quản lý Tài khoản Admin (/admin/users)
 * Kết nối Real Data với Backend (API 135: GET /api/admin/accounts, API 136: ban, API 137: unban)
 * Đồng thời hiển thị danh sách Đề xuất khóa tài khoản tổ chức từ Moderator (PROPOSE_BAN - Bước 5 Luồng Báo cáo vi phạm)
 */
export default function AdminAccountsPage() {
  const { onLogAction } = useOutletContext() || {};
  const { user } = useAuth();
  const toast = useToast();
  const [remoteAccounts, setRemoteAccounts] = useState([]);
  const [banProposals, setBanProposals] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => getDismissedProposalIds());
  const [processingProposalId, setProcessingProposalId] = useState(null);
  const [confirmProposal, setConfirmProposal] = useState(null);
  const [proposalBanReason, setProposalBanReason] = useState('');

  // Phân trang thật theo API 135 (BE trả totalElements/totalPages đúng tổng số tài khoản, không phải
  // số viết cứng từ bản thiết kế mẫu); đổi trang thì tải lại đúng trang đó từ server.
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Lọc theo ngày tạo tài khoản; mặc định "Toàn thời gian" để không ẩn tài khoản cũ khi mới vào trang.
  const dateFilter = useAdminPeriod('ALL');
  const { activeRange: dateRange, dateError } = dateFilter;

  // Đổi khoảng ngày thì quay về trang đầu, giống các trang có phân trang + bộ lọc thời gian khác
  useEffect(() => {
    setPage(0);
  }, [dateRange.apiFrom, dateRange.apiTo]);

  const fetchAccountsAndProposals = useCallback(async () => {
    if (dateError) {
      setAccountsLoading(false);
      return;
    }

    let rawAccounts = [];
    let rawLogs = [];
    let pageTotalElements = 0;
    let pageTotalPages = 1;

    try {
      setAccountsLoading(true);
      const res = await adminApi.getAccounts({
        page,
        size: PAGE_SIZE,
        from: dateRange.apiFrom,
        to: dateRange.apiTo,
      });
      rawAccounts = Array.isArray(res) ? res : res?.content || res?.result?.content || [];
      pageTotalElements = res?.totalElements ?? rawAccounts.length;
      pageTotalPages = res?.totalPages ?? 1;
    } catch (err) {
      console.warn('Lỗi gọi API accounts:', err);
    } finally {
      setAccountsLoading(false);
    }

    try {
      if (typeof adminApi.getAuditLogs === 'function') {
        const logRes = await adminApi.getAuditLogs({ page: 0, size: 100 });
        rawLogs = Array.isArray(logRes) ? logRes : logRes?.content || logRes?.result?.content || [];
      }
    } catch (err) {
      console.warn('Lỗi gọi API audit-logs cho đề xuất khóa:', err);
    }

    // Gom lịch sử vi phạm theo targetId / accountId từ AuditLog
    const violationHistoryByTarget = {};
    rawLogs.forEach((log) => {
      if (!log?.targetId || typeof log.actionType !== 'string') return;
      if (
        log.actionType.startsWith('VIOLATION_RESOLVE_') ||
        log.actionType === 'BAN_ACCOUNT' ||
        log.actionType === 'UNBAN_ACCOUNT'
      ) {
        if (!violationHistoryByTarget[log.targetId]) {
          violationHistoryByTarget[log.targetId] = [];
        }
        const reason =
          (typeof log.detail === 'object' && log.detail?.reason) ||
          (typeof log.detail === 'string' ? log.detail : 'Ghi nhận xử lý vi phạm');
        const actionLabel =
          log.actionType === 'VIOLATION_RESOLVE_PROPOSE_BAN' || log.actionType === 'BAN_ACCOUNT'
            ? 'Khóa'
            : 'Cảnh cáo / Xử lý';
        violationHistoryByTarget[log.targetId].push({
          date: log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—',
          action: actionLabel,
          actor: log.actorName || log.actorEmail || 'Moderator',
          reason,
          rawActionType: log.actionType,
        });
      }
    });

    const mappedAccounts = rawAccounts.map((acc, idx) => {
      const roleStr = String(acc.role || '').toUpperCase();
      let roleLabel = 'Member';
      if (roleStr.includes('MODERATOR') || roleStr.includes('STAFF')) {
        roleLabel = 'Moderator';
      } else if (roleStr.includes('ORG')) {
        roleLabel = 'Organizer';
      } else if (roleStr.includes('ADMIN')) {
        roleLabel = 'Admin';
      }

      const name = acc.fullName || (acc.email ? acc.email.split('@')[0] : `User-${idx + 1}`);
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .map((w) => w[0])
          .slice(-2)
          .join('')
          .toUpperCase() || 'US';

      const isBanned = acc.status === 'BANNED' || acc.status === 'LOCKED';
      const accountId = acc.accountId || `USR-${idx + 101}`;
      const auditHistory = violationHistoryByTarget[accountId] || [];

      const initialHistory = acc.banReason
        ? [
            {
              date: new Date().toLocaleDateString('vi-VN'),
              action: 'Khóa',
              actor: 'Hệ thống / Admin',
              reason: acc.banReason,
            },
            ...auditHistory,
          ]
        : auditHistory;

      return {
        id: accountId,
        code: acc.code || (acc.accountId ? String(acc.accountId).slice(0, 6) : String(849100 + idx)),
        name,
        initials,
        email: acc.email || '',
        phone: acc.phone || '—',
        role: roleLabel,
        createdAt: acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('vi-VN') : '—',
        status: isBanned ? 'LOCKED' : 'ACTIVE',
        history: initialHistory,
      };
    });

    setRemoteAccounts(mappedAccounts);
    setTotalElements(pageTotalElements);
    setTotalPages(pageTotalPages);

    // Lọc danh sách các đề xuất khóa từ Moderator (VIOLATION_RESOLVE_PROPOSE_BAN)
    const proposals = rawLogs
      .filter((log) => log.actionType === 'VIOLATION_RESOLVE_PROPOSE_BAN')
      .map((log, idx) => {
        const matchedAccount = mappedAccounts.find((a) => a.id === log.targetId);
        const reason =
          (typeof log.detail === 'object' && log.detail?.reason) ||
          'Vi phạm nghiêm trọng quy định cộng đồng';
        const closedReportCount =
          (typeof log.detail === 'object' && log.detail?.closedReportCount) || 1;
        const pastViolations = (violationHistoryByTarget[log.targetId] || []).length;

        return {
          id: log.id || `PROP-${idx}`,
          targetId: log.targetId,
          targetName: matchedAccount?.name || `Tổ chức #${String(log.targetId).slice(0, 8)}`,
          targetEmail: matchedAccount?.email || '',
          accountStatus: matchedAccount?.status || 'ACTIVE',
          actorName: log.actorName || log.actorEmail || 'Moderator',
          createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—',
          reason,
          closedReportCount,
          pastViolations,
        };
      });

    setBanProposals(proposals);
  }, [page, dateRange.apiFrom, dateRange.apiTo, dateError]);

  useEffect(() => {
    fetchAccountsAndProposals();
  }, [fetchAccountsAndProposals]);

  const handleBanAccount = async (accountId, reason) => {
    try {
      await adminApi.banAccount(accountId, reason);
      toast.success('Đã khóa tài khoản thành công.');
      await fetchAccountsAndProposals();
    } catch (err) {
      console.warn('Lỗi khi khóa tài khoản:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể khóa tài khoản.';
      toast.error(`Khóa tài khoản thất bại: ${msg}`);
      throw err;
    }
  };

  const handleUnbanAccount = async (accountId) => {
    try {
      await adminApi.unbanAccount(accountId);
      toast.success('Đã mở khóa tài khoản thành công.');
      await fetchAccountsAndProposals();
    } catch (err) {
      console.warn('Lỗi khi mở khóa tài khoản:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể mở khóa tài khoản.';
      toast.error(`Mở khóa thất bại: ${msg}`);
      throw err;
    }
  };

  const openConfirmProposalModal = (proposal) => {
    if (!proposal?.targetId) return;
    setConfirmProposal(proposal);
    setProposalBanReason(`Khóa theo đề xuất của Moderator (${proposal.actorName}): ${proposal.reason}`);
  };

  const handleApproveProposal = async () => {
    const proposal = confirmProposal;
    if (!proposal?.targetId || processingProposalId === proposal.id) return;
    const trimmedReason = proposalBanReason.trim();
    if (!trimmedReason) {
      toast.warn('Vui lòng nhập lý do khóa tài khoản.');
      return;
    }
    setProcessingProposalId(proposal.id);
    try {
      await adminApi.banAccount(proposal.targetId, trimmedReason);
      const nextDismissed = [...dismissedIds, proposal.id];
      setDismissedIds(nextDismissed);
      saveDismissedProposalIds(nextDismissed);
      setConfirmProposal(null);
      setProposalBanReason('');
      toast.success(`Đã khóa tài khoản "${proposal.targetName}" theo đề xuất.`);
      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: user?.fullName || 'Admin',
          role: 'Admin',
          action: `Khóa tài khoản Tổ chức "${proposal.targetName}" theo đề xuất khóa tài khoản`,
        });
      }
      await fetchAccountsAndProposals();
    } catch (err) {
      console.warn('Lỗi khi khóa tài khoản theo đề xuất:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể khóa tài khoản theo đề xuất.';
      toast.error(`Khóa tài khoản thất bại: ${msg}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleDismissProposal = (proposalId) => {
    const nextDismissed = [...dismissedIds, proposalId];
    setDismissedIds(nextDismissed);
    saveDismissedProposalIds(nextDismissed);
  };

  const activeProposals = banProposals.filter(
    (p) => !dismissedIds.includes(p.id) && p.accountStatus !== 'LOCKED'
  );

  return (
    <div className="space-y-6">
      {activeProposals.length > 0 && (
        <div className="bg-[#FFF5F5] border border-[#FECACA] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FECACA]/70 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#DC2626] text-xl">
                gavel
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#991B1B] font-heading">
                  Đề xuất khóa tài khoản từ Moderator (PROPOSE_BAN)
                </h2>
                <p className="text-xs text-[#B91C1C]">
                  Moderator đã kiểm duyệt báo cáo vi phạm và đề xuất Admin xem xét khóa các tài khoản tổ chức dưới đây.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#DC2626] text-white">
              {activeProposals.length} đề xuất chờ duyệt
            </span>
          </div>

          <div className="space-y-3">
            {activeProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white rounded-xl border border-[#FECACA] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#191C19]">
                      {proposal.targetName}
                    </span>
                    {proposal.targetEmail && (
                      <span className="font-mono text-[#717971]">
                        ({proposal.targetEmail})
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] font-bold text-[11px]">
                      {proposal.closedReportCount} báo cáo gom nhóm
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#F6F9F4] border border-[#DDE5D9] text-[#414942] font-semibold text-[11px]">
                      {proposal.pastViolations} lần ghi nhận vi phạm
                    </span>
                  </div>
                  <p className="text-[#414942]">
                    Lý do đề xuất:{' '}
                    <strong className="text-[#191C19] italic">"{proposal.reason}"</strong>
                  </p>
                  <p className="text-[11px] text-[#717971]">
                    Đề xuất bởi: <strong className="text-[#414942]">{proposal.actorName}</strong> · Thời gian: {proposal.createdAt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={processingProposalId === proposal.id}
                    onClick={() => handleDismissProposal(proposal.id)}
                    className="px-3.5 py-2 rounded-xl border border-[#DDE5D9] bg-white hover:bg-[#F6F9F4] text-xs font-semibold text-[#414942] transition-colors disabled:opacity-50"
                  >
                    Bỏ qua đề xuất
                  </button>
                  <button
                    type="button"
                    disabled={processingProposalId === proposal.id}
                    onClick={() => openConfirmProposalModal(proposal)}
                    className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
                    <span>
                      {processingProposalId === proposal.id ? 'Đang khóa...' : 'Khóa theo đề xuất'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminAccountsView
        onLogAction={onLogAction}
        remoteAccounts={remoteAccounts}
        onBanAccount={handleBanAccount}
        onUnbanAccount={handleUnbanAccount}
        page={page}
        onPageChange={setPage}
        totalElements={totalElements}
        totalPages={totalPages}
        accountsLoading={accountsLoading}
        dateFilter={dateFilter}
        dateError={dateError}
      />

      <Modal
        isOpen={Boolean(confirmProposal)}
        onClose={() => { if (!processingProposalId) setConfirmProposal(null); }}
        title="Xác nhận khóa tài khoản theo đề xuất"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] space-y-1">
            <p className="font-bold">
              Tài khoản bị khóa: {confirmProposal?.targetName}
            </p>
            <p className="leading-relaxed">
              Thao tác này sẽ tạm khóa quyền truy cập của tài khoản và ghi nhận vào nhật ký kiểm toán. Vui lòng kiểm tra kỹ lý do trước khi xác nhận.
            </p>
          </div>
          <div>
            <label htmlFor="proposal-ban-reason" className="block font-bold text-[#1F2A37] mb-1">
              Lý do khóa tài khoản <span className="text-[#D92D20]">*</span>
            </label>
            <textarea
              id="proposal-ban-reason"
              rows={3}
              disabled={Boolean(processingProposalId)}
              value={proposalBanReason}
              onChange={(e) => setProposalBanReason(e.target.value)}
              className="w-full p-2.5 border border-[#DDE5D9] rounded-xl text-[#1F2A37] focus:outline-none focus:border-[#006B2C]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#DDE5D9]">
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(processingProposalId)}
              onClick={() => setConfirmProposal(null)}
            >
              Hủy bỏ
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={Boolean(processingProposalId)}
              disabled={Boolean(processingProposalId) || !proposalBanReason.trim()}
              onClick={handleApproveProposal}
            >
              Xác nhận khóa tài khoản
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
