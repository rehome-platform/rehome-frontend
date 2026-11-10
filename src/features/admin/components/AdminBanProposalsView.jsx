import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi.js';
import { Badge, Button } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { formatDateTime } from '../../../utils/formatters.js';

const TARGET_TYPE_LABEL = {
  ORGANIZATION_ACCOUNT: 'Tài khoản Tổ chức',
  POST: 'Bài viết cộng đồng',
  CAMPAIGN: 'Chiến dịch quyên góp',
};

const VIOLATION_ACTION_LABEL = {
  REMOVE_POST: 'Gỡ bài viết vi phạm',
  HIDE_CAMPAIGN: 'Ẩn chiến dịch vi phạm',
  WARN_ORG: 'Cảnh cáo tổ chức',
  PROPOSE_BAN: 'Đề xuất Admin khóa tài khoản',
  VIOLATION_RESOLVE_REMOVE_POST: 'Gỡ bài viết vi phạm',
  VIOLATION_RESOLVE_HIDE_CAMPAIGN: 'Ẩn chiến dịch vi phạm',
  VIOLATION_RESOLVE_WARN_ORG: 'Cảnh cáo tổ chức',
  VIOLATION_RESOLVE_PROPOSE_BAN: 'Đề xuất Admin khóa tài khoản',
};

/**
 * Giao diện Admin xem & xử lý đề xuất khóa tài khoản từ Moderator (PROPOSE_BAN)
 * - Nối API GET /api/admin/audit-logs?actionType=VIOLATION_RESOLVE_PROPOSE_BAN
 * - Đối chiếu trạng thái tài khoản qua GET /api/admin/accounts
 * - Xem chi tiết lý do đề xuất & Lịch sử vi phạm của tổ chức
 * - Thực hiện Khóa tài khoản (POST /api/admin/accounts/{id}/ban) hoặc Bỏ qua
 */
export default function AdminBanProposalsView({ onPendingCountChange }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const onPendingCountChangeRef = useRef(onPendingCountChange);
  onPendingCountChangeRef.current = onPendingCountChange;

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING | BANNED | DISMISSED | ALL
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer xem chi tiết & lịch sử vi phạm
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [violationHistory, setViolationHistory] = useState([]);
  const [reportSnapshot, setReportSnapshot] = useState(null);

  // Modal xác nhận khóa tài khoản
  const [banModalTarget, setBanModalTarget] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      const [auditRes, accountsRes] = await Promise.allSettled([
        adminApi.getBanProposals({ page: 0, size: 50 }),
        adminApi.getAccounts({ page: 0, size: 100 }),
      ]);

      const rawLogs =
        auditRes.status === 'fulfilled'
          ? Array.isArray(auditRes.value)
            ? auditRes.value
            : auditRes.value?.content || []
          : [];

      const rawAccounts =
        accountsRes.status === 'fulfilled'
          ? Array.isArray(accountsRes.value)
            ? accountsRes.value
            : accountsRes.value?.content || []
          : [];

      const accountMap = new Map();
      rawAccounts.forEach((acc) => {
        if (acc.accountId) {
          accountMap.set(String(acc.accountId), acc);
        }
      });

      const dismissedIds = adminApi.getDismissedProposals();

      const mapped = rawLogs.map((log) => {
        const detailObj = typeof log.detail === 'object' && log.detail !== null ? log.detail : {};
        const targetId = String(log.targetId || '');
        const matchedAccount = accountMap.get(targetId);

        const isBanned =
          matchedAccount?.status === 'BANNED' || matchedAccount?.status === 'LOCKED';
        const isDismissed = dismissedIds.includes(String(log.id));

        let status = 'PENDING';
        if (isBanned) {
          status = 'BANNED';
        } else if (isDismissed) {
          status = 'DISMISSED';
        }

        const orgName =
          matchedAccount?.fullName ||
          detailObj.organizationDisplayName ||
          (matchedAccount?.email ? matchedAccount.email.split('@')[0] : `Tổ chức #${targetId.slice(0, 8).toUpperCase()}`);

        const initials =
          orgName
            .split(' ')
            .filter(Boolean)
            .map((w) => w[0])
            .slice(-2)
            .join('')
            .toUpperCase() || 'TC';

        return {
          id: String(log.id),
          targetId,
          targetType: log.targetType || 'ORGANIZATION_ACCOUNT',
          orgName,
          initials,
          orgEmail: matchedAccount?.email || '—',
          orgPhone: matchedAccount?.phone || '—',
          orgRole: matchedAccount?.role || 'ORGANIZATION',
          accountId: matchedAccount?.accountId || targetId,
          moderatorName: log.actorName || (log.actorEmail ? log.actorEmail.split('@')[0] : 'Moderator'),
          moderatorEmail: log.actorEmail || '—',
          proposeReason: detailObj.reason || 'Vi phạm quy định cộng đồng nhiều lần',
          closedReportCount: detailObj.closedReportCount || 1,
          primaryReportId: detailObj.primaryReportId || null,
          createdAt: log.createdAt,
          banReasonOnAccount: matchedAccount?.banReason || null,
          status,
        };
      });

      setProposals(mapped);

      const pendingCount = mapped.filter((p) => p.status === 'PENDING').length;
      if (typeof onPendingCountChangeRef.current === 'function') {
        onPendingCountChangeRef.current(pendingCount);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đề xuất khóa:', err);
      toastRef.current?.error?.('Không thể tải danh sách đề xuất khóa tài khoản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Mở Drawer xem chi tiết đề xuất & Lịch sử vi phạm của tổ chức
  const handleInspectProposal = async (proposal) => {
    setSelectedProposal(proposal);
    setViolationHistory([]);
    setReportSnapshot(null);
    setHistoryLoading(true);

    try {
      const [detailRes, auditHistoryRes] = await Promise.allSettled([
        proposal.primaryReportId
          ? adminApi.getViolationReportDetail(proposal.primaryReportId)
          : Promise.resolve(null),
        adminApi.getOrganizationViolationAuditLogs(proposal.targetId),
      ]);

      const reportDetail = detailRes.status === 'fulfilled' ? detailRes.value : null;
      const auditHistory = auditHistoryRes.status === 'fulfilled' ? auditHistoryRes.value : [];

      if (reportDetail?.targetSnapshot) {
        setReportSnapshot(reportDetail.targetSnapshot);
      }

      // Ưu tiên lấy lịch sử từ reportDetail.organizationViolationHistory.actions nếu có,
      // nếu không (hoặc bổ sung) lấy từ AuditLog của hệ thống
      if (reportDetail?.organizationViolationHistory?.actions?.length > 0) {
        setViolationHistory(
          reportDetail.organizationViolationHistory.actions.map((item, idx) => ({
            id: `hist-${idx}`,
            action: item.action,
            targetType: item.targetType,
            targetId: item.targetId,
            reason: item.reason,
            date: item.date,
          }))
        );
      } else if (auditHistory.length > 0) {
        setViolationHistory(
          auditHistory.map((item) => ({
            id: item.id,
            action: item.actionType,
            targetType: item.targetType,
            targetId: item.targetId,
            reason: item.detail?.reason || 'Vi phạm quy chuẩn cộng đồng',
            date: item.createdAt,
            actorName: item.actorName,
          }))
        );
      }
    } catch (err) {
      console.warn('Không thể tải chi tiết lịch sử mở rộng:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Mở Modal xác nhận khóa tài khoản
  const handleOpenBanModal = (proposal) => {
    setBanModalTarget(proposal);
    setBanReason(
      `Khóa theo đề xuất của Moderator (${proposal.moderatorName}): ${proposal.proposeReason}`
    );
  };

  // Thực thi gọi API POST /api/admin/accounts/{id}/ban
  const handleConfirmBan = async () => {
    if (!banModalTarget) return;
    if (!banReason.trim()) {
      toast.warn('Vui lòng nhập lý do khóa tài khoản.');
      return;
    }

    try {
      setBanSubmitting(true);
      await adminApi.banAccount(banModalTarget.accountId, banReason.trim());
      toast.success(`Đã khóa tài khoản [${banModalTarget.orgName}] thành công!`);
      setBanModalTarget(null);
      setBanReason('');

      if (selectedProposal?.id === banModalTarget.id) {
        setSelectedProposal((prev) => (prev ? { ...prev, status: 'BANNED' } : null));
      }
      await loadProposals();
    } catch (err) {
      console.error('Lỗi khi khóa tài khoản từ đề xuất:', err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể khóa tài khoản. Vui lòng kiểm tra mã tài khoản tổ chức.'
      );
    } finally {
      setBanSubmitting(false);
    }
  };

  // Thực thi Bỏ qua đề xuất
  const handleDismissProposal = (proposal) => {
    adminApi.dismissBanProposal(proposal.id);
    toast.info(`Đã bỏ qua đề xuất khóa đối với [${proposal.orgName}].`);

    if (selectedProposal?.id === proposal.id) {
      setSelectedProposal((prev) => (prev ? { ...prev, status: 'DISMISSED' } : null));
    }
    loadProposals();
  };

  // Đếm số lượng theo từng trạng thái
  const counts = {
    ALL: proposals.length,
    PENDING: proposals.filter((p) => p.status === 'PENDING').length,
    BANNED: proposals.filter((p) => p.status === 'BANNED').length,
    DISMISSED: proposals.filter((p) => p.status === 'DISMISSED').length,
  };

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchOrg = p.orgName.toLowerCase().includes(q);
      const matchId = p.targetId.toLowerCase().includes(q);
      const matchMod = p.moderatorName.toLowerCase().includes(q);
      const matchReason = p.proposeReason.toLowerCase().includes(q);
      if (!matchOrg && !matchId && !matchMod && !matchReason) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header & Bộ lọc */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8E0] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">gavel</span>
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-[#191C19] font-heading">
                  Đề Xuất Khóa Tài Khoản Từ Moderator (PROPOSE_BAN)
                </h2>
                <p className="text-xs text-[#717971]">
                  Xem xét lý do đề xuất, lịch sử vi phạm của tổ chức và quyết định Khóa tài khoản hoặc Bỏ qua
                </p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAF8] p-1 rounded-xl border border-[#E2E8E0]">
            {[
              { id: 'PENDING', label: 'Chờ xử lý', count: counts.PENDING },
              { id: 'BANNED', label: 'Đã khóa', count: counts.BANNED },
              { id: 'DISMISSED', label: 'Đã bỏ qua', count: counts.DISMISSED },
              { id: 'ALL', label: 'Tất cả', count: counts.ALL },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#006B2C] text-white shadow-2xs'
                    : 'text-[#414942] hover:bg-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : tab.id === 'PENDING' && tab.count > 0
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-[#E2E8E0] text-[#414942]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Thanh tìm kiếm & Làm mới */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#717971] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên tổ chức, mã ID, Moderator hoặc lý do đề xuất..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-[#F8FAF8] text-[#191C19] focus:outline-none focus:border-[#006B2C] focus:bg-white transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={loadProposals}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8E0] bg-white hover:bg-[#F0F5EE] text-xs font-bold text-[#414942] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* Bảng Danh sách Đề xuất khóa */}
      <div className="bg-white border border-[#E2E8E0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF8] border-b border-[#E2E8E0] text-[11px] uppercase font-bold text-[#717971] tracking-wider">
                <th className="py-3.5 px-4">Tổ chức / Đối tượng bị đề xuất</th>
                <th className="py-3.5 px-4">Moderator đề xuất</th>
                <th className="py-3.5 px-4">Lý do đề xuất & Số báo cáo</th>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Quyết định của Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E0]">
              {loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#717971]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#006B2C] border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải danh sách đề xuất khóa từ hệ thống...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredProposals.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#717971]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-[#006B2C]/60">
                        verified_user
                      </span>
                      <span className="font-semibold text-[#191C19]">
                        Không có đề xuất khóa tài khoản nào trong mục này
                      </span>
                      <span className="text-[11px]">
                        Khi Moderator chọn "Đề xuất Admin khóa tài khoản (PROPOSE_BAN)", yêu cầu sẽ xuất hiện tại đây.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredProposals.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F8FAF8]/80 transition-colors"
                  >
                    {/* Tổ chức / Đối tượng */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#DC2626] font-bold text-xs flex items-center justify-center shrink-0 border border-[#FECACA]">
                          {item.initials}
                        </div>
                        <div>
                          <div className="font-bold text-[#191C19]">{item.orgName}</div>
                          <div className="text-[11px] text-[#717971] font-mono">
                            #{item.targetId.slice(0, 8).toUpperCase()} · {TARGET_TYPE_LABEL[item.targetType] || item.targetType}
                          </div>
                          {item.orgEmail !== '—' && (
                            <div className="text-[11px] text-[#717971]">{item.orgEmail}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Moderator đề xuất */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#191C19]">{item.moderatorName}</div>
                      <div className="text-[11px] text-[#717971]">{item.moderatorEmail}</div>
                    </td>

                    {/* Lý do & Số báo cáo */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          {item.closedReportCount} báo cáo vi phạm
                        </span>
                      </div>
                      <p className="text-[#191C19] line-clamp-2 italic" title={item.proposeReason}>
                        "{item.proposeReason}"
                      </p>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-[#717971] whitespace-nowrap">
                      {item.createdAt ? formatDateTime(item.createdAt) : '—'}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4">
                      {item.status === 'PENDING' && (
                        <Badge variant="warning">Chờ xử lý</Badge>
                      )}
                      {item.status === 'BANNED' && (
                        <Badge variant="error">Đã khóa (BANNED)</Badge>
                      )}
                      {item.status === 'DISMISSED' && (
                        <Badge variant="neutral">Đã bỏ qua</Badge>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleInspectProposal(item)}
                          className="px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-white hover:bg-[#F0F5EE] text-[#191C19] font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Lịch sử & Chi tiết
                        </button>

                        {item.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenBanModal(item)}
                              className="px-3 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                            >
                              Khóa tài khoản
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissProposal(item)}
                              className="px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-[#F8FAF8] hover:bg-[#E2E8E0]/60 text-[#717971] font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Bỏ qua
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= DRAWER / MODAL XEM CHI TIẾT & LỊCH SỬ VI PHẠM ================= */}
      {selectedProposal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedProposal(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-[#E2E8E0] flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[#E2E8E0] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">
                    Hồ sơ đề xuất khóa tài khoản
                  </span>
                  <h3 className="text-lg font-extrabold text-[#191C19] font-heading mt-0.5">
                    {selectedProposal.orgName}
                  </h3>
                  <p className="text-xs text-[#717971] font-mono">
                    ID: {selectedProposal.targetId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="w-8 h-8 rounded-xl border border-[#E2E8E0] flex items-center justify-center text-[#717971] hover:text-[#191C19] hover:bg-[#F8FAF8] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Thông tin Đề xuất từ Moderator */}
              <div className="p-4 rounded-2xl bg-[#FEF2F2]/60 border border-[#FECACA] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DC2626] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">report</span>
                    <span>Kiến nghị từ Moderator: {selectedProposal.moderatorName}</span>
                  </span>
                  <span className="text-[#717971]">
                    {selectedProposal.createdAt ? formatDateTime(selectedProposal.createdAt) : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#FECACA] text-[#191C19]">
                  <span className="text-[#717971] block text-[11px] mb-0.5">Lý do đề xuất khóa:</span>
                  <strong className="text-xs">"{selectedProposal.proposeReason}"</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#717971]">
                  <span>Số báo cáo từ Member trong đợt này: <strong>{selectedProposal.closedReportCount} báo cáo</strong></span>
                  <span>Loại đối tượng: <strong>{TARGET_TYPE_LABEL[selectedProposal.targetType] || selectedProposal.targetType}</strong></span>
                </div>
              </div>

              {/* Thông tin Snapshot Tổ chức (nếu có) */}
              {reportSnapshot && (
                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E2E8E0] space-y-2 text-xs">
                  <div className="font-bold text-[#191C19]">Thông tin Hồ sơ Tổ chức / Nội dung</div>
                  {reportSnapshot.organizationLegalName && (
                    <div>Tên pháp lý: <strong>{reportSnapshot.organizationLegalName}</strong></div>
                  )}
                  {reportSnapshot.organizationDescription && (
                    <div className="text-[#717971]">{reportSnapshot.organizationDescription}</div>
                  )}
                </div>
              )}

              {/* Khối Lịch sử vi phạm của Tổ chức */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">
                    Lịch sử bị xử lý vi phạm ({violationHistory.length})
                  </h4>
                  <span className="text-[11px] text-[#717971]">
                    Trích xuất từ Nhật ký kiểm duyệt
                  </span>
                </div>

                {historyLoading ? (
                  <div className="p-6 text-center text-xs text-[#717971] bg-[#F8FAF8] rounded-xl border border-[#E2E8E0]">
                    Đang tải lịch sử vi phạm...
                  </div>
                ) : violationHistory.length === 0 ? (
                  <div className="p-4 text-xs text-[#717971] bg-[#F8FAF8] rounded-xl border border-[#E2E8E0]">
                    Chỉ ghi nhận lần đề xuất khóa hiện tại ({selectedProposal.proposeReason}).
                  </div>
                ) : (
                  <div className="divide-y divide-[#E2E8E0] border border-[#E2E8E0] rounded-2xl overflow-hidden text-xs">
                    {violationHistory.map((h, i) => (
                      <div key={h.id || i} className="p-3.5 bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#191C19]">
                            {VIOLATION_ACTION_LABEL[h.action] || h.action}
                          </span>
                          <span className="text-[11px] text-[#717971]">
                            {h.date ? formatDateTime(h.date) : '—'}
                          </span>
                        </div>
                        <p className="text-[#414942]">
                          Lý do: <span className="italic">"{h.reason}"</span>
                        </p>
                        {h.actorName && (
                          <div className="text-[11px] text-[#717971]">
                            Người xử lý: {h.actorName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-[#E2E8E0] bg-[#F8FAF8] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8E0] bg-white text-xs font-bold text-[#414942] hover:bg-[#F0F5EE] cursor-pointer"
              >
                Đóng
              </button>

              {selectedProposal.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDismissProposal(selectedProposal)}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8E0] bg-white text-xs font-bold text-[#717971] hover:bg-[#E2E8E0]/50 cursor-pointer"
                  >
                    Bỏ qua đề xuất
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBanModal(selectedProposal)}
                    className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Khóa tài khoản ngay
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN KHÓA TÀI KHOẢN ================= */}
      {banModalTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setBanModalTarget(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8E0] max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#191C19] font-heading">
                  Xác nhận khóa tài khoản tổ chức?
                </h3>
                <p className="text-xs text-[#717971]">
                  Tổ chức: <strong className="text-[#191C19]">{banModalTarget.orgName}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed">
              Khi bị khóa (BANNED), tài khoản sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức và không thể tiếp tục hoạt động trên nền tảng.
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191C19] mb-1.5">
                Lý do khóa tài khoản <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                rows="3"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do khóa tài khoản..."
                className="w-full p-3 text-xs rounded-xl border border-[#E2E8E0] text-[#191C19] focus:outline-none focus:border-[#DC2626] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={banSubmitting}
                onClick={() => setBanModalTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8E0] bg-white text-xs font-bold text-[#414942] hover:bg-[#F8FAF8] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={banSubmitting}
                onClick={handleConfirmBan}
                className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {banSubmitting ? 'Đang khóa...' : 'Xác nhận Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
