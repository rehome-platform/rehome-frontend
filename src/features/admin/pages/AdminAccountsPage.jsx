import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminAccountsView from '../components/AdminAccountsView.jsx';
import adminApi from '../services/adminApi.js';

const DISMISSED_PROPOSALS_STORAGE_KEY = 'rehome_admin_dismissed_ban_proposals';

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
  const [remoteAccounts, setRemoteAccounts] = useState([]);
  const [banProposals, setBanProposals] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => getDismissedProposalIds());
  const [processingProposalId, setProcessingProposalId] = useState(null);

  const fetchAccountsAndProposals = useCallback(async () => {
    let rawAccounts = [];
    let rawLogs = [];

    try {
      const res = await adminApi.getAccounts({ page: 0, size: 50 });
      rawAccounts = Array.isArray(res) ? res : res?.content || res?.result?.content || [];
    } catch (err) {
      console.warn('Lỗi gọi API accounts:', err);
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
  }, []);

  useEffect(() => {
    fetchAccountsAndProposals();
  }, [fetchAccountsAndProposals]);

  const handleBanAccount = async (accountId, reason) => {
    try {
      await adminApi.banAccount(accountId, reason);
      await fetchAccountsAndProposals();
    } catch (err) {
      console.warn('Lỗi khi khóa tài khoản:', err);
    }
  };

  const handleUnbanAccount = async (accountId) => {
    try {
      await adminApi.unbanAccount(accountId);
      await fetchAccountsAndProposals();
    } catch (err) {
      console.warn('Lỗi khi mở khóa tài khoản:', err);
    }
  };

  const handleApproveProposal = async (proposal) => {
    if (!proposal?.targetId) return;
    setProcessingProposalId(proposal.id);
    try {
      const banReason = `Khóa theo đề xuất của Moderator (${proposal.actorName}): ${proposal.reason}`;
      await adminApi.banAccount(proposal.targetId, banReason);
      const nextDismissed = [...dismissedIds, proposal.id];
      setDismissedIds(nextDismissed);
      saveDismissedProposalIds(nextDismissed);
      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          action: `Khóa tài khoản Tổ chức "${proposal.targetName}" theo đề xuất PROPOSE_BAN`,
        });
      }
      await fetchAccountsAndProposals();
    } catch (err) {
      console.warn('Lỗi khi khóa tài khoản theo đề xuất:', err);
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
                    onClick={() => handleDismissProposal(proposal.id)}
                    className="px-3.5 py-2 rounded-xl border border-[#DDE5D9] bg-white hover:bg-[#F6F9F4] text-xs font-semibold text-[#414942] transition-colors"
                  >
                    Bỏ qua đề xuất
                  </button>
                  <button
                    type="button"
                    disabled={processingProposalId === proposal.id}
                    onClick={() => handleApproveProposal(proposal)}
                    className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span>
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
      />
    </div>
  );
}
