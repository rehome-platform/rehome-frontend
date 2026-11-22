import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi.js';
import { Badge, Button, Spinner, TableActionButton } from '../../../components/common/index.js';
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
  PROPOSE_BAN: 'Đề xuất khóa tài khoản',
  VIOLATION_RESOLVE_REMOVE_POST: 'Gỡ bài viết vi phạm',
  VIOLATION_RESOLVE_HIDE_CAMPAIGN: 'Ẩn chiến dịch vi phạm',
  VIOLATION_RESOLVE_WARN_ORG: 'Cảnh cáo tổ chức',
  VIOLATION_RESOLVE_PROPOSE_BAN: 'Đề xuất khóa tài khoản',
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
  const [banPreview, setBanPreview] = useState(null);
  const [banPreviewLoading, setBanPreviewLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [auditRes, accountsRes] = await Promise.allSettled([
        adminApi.getBanProposals({ page: 0, size: 50 }),
        adminApi.getAccounts({ page: 0, size: 100 }),
      ]);

      if (auditRes.status === 'rejected') {
        const err = auditRes.reason;
        setLoadError(
          err?.response?.data?.message || err?.message || 'Không thể tải danh sách đề xuất khóa tài khoản.'
        );
      }

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

        return {
          id: String(log.id),
          targetId,
          targetType: log.targetType || 'ORGANIZATION_ACCOUNT',
          orgName,
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
  const handleOpenBanModal = async (proposal) => {
    setBanModalTarget(proposal);
    setBanReason(
      `Khóa theo đề xuất của Moderator (${proposal.moderatorName}): ${proposal.proposeReason}`
    );
    setBanPreview(null);
    if (proposal?.accountId) {
      setBanPreviewLoading(true);
      try {
        const preview = await adminApi.getBanPreview(proposal.accountId);
        setBanPreview(preview);
      } catch {
        setBanPreview(null);
      } finally {
        setBanPreviewLoading(false);
      }
    }
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
      <div className="bg-white p-5 rounded-2xl border border-[#DDE5D9] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#DDE5D9] pb-4">

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F6F9F4] p-1 rounded-xl border border-[#DDE5D9]">
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
                    : 'text-[#5B6776] hover:bg-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : tab.id === 'PENDING' && tab.count > 0
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-[#DDE5D9] text-[#5B6776]'
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
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6776] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên tổ chức, mã ID, nhân viên đề xuất hoặc lý do..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] text-[#1F2A37] focus:outline-none focus:border-[#006B2C] focus:bg-white transition-colors"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadProposals}
            className="gap-1.5 whitespace-nowrap"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Làm mới danh sách</span>
          </Button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C] flex items-center justify-between gap-3"
        >
          <span>{loadError}</span>
          <Button
            type="button"
            variant="danger-outline"
            size="sm"
            onClick={loadProposals}
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Bảng Danh sách Đề xuất khóa */}
      <div
        className={`bg-white border border-[#DDE5D9] rounded-2xl overflow-hidden shadow-xs transition-opacity duration-150 ${
          loading && proposals.length > 0 ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F6F9F4] border-b border-[#DDE5D9] text-[11px] font-bold text-[#5B6776] tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap w-[18%]">Tổ chức</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[15%]">Nhân viên đề xuất</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[21%]">Lý do đề xuất</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center w-[8%]">Số báo cáo</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[12%]">Thời gian</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[10%]">Trạng thái</th>
                <th className="py-3.5 px-6 text-center whitespace-nowrap w-[16%]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE5D9]">
              {loading && proposals.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#5B6776]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner size="lg" />
                      <span>Đang tải danh sách đề xuất khóa từ hệ thống...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!(loading && proposals.length === 0) && filteredProposals.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#5B6776]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-[#006B2C]/60">
                        verified_user
                      </span>
                      <span className="font-semibold text-[#1F2A37]">
                        Không có đề xuất khóa tài khoản nào trong mục này
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!(loading && proposals.length === 0) &&
                filteredProposals.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F6F9F4]/80 transition-colors"
                  >
                    {/* Tổ chức */}
                    <td className="py-3.5 px-4 font-bold text-[#1F2A37] whitespace-nowrap overflow-hidden text-ellipsis" title={item.orgName}>
                      {item.orgName}
                    </td>

                    {/* Moderator đề xuất */}
                    <td className="py-3.5 px-4 font-semibold text-[#1F2A37] whitespace-nowrap overflow-hidden text-ellipsis" title={item.moderatorName}>
                      {item.moderatorName}
                    </td>

                    {/* Lý do */}
                    <td className="py-3.5 px-4 text-[#5B6776] whitespace-nowrap overflow-hidden text-ellipsis" title={item.proposeReason}>
                      {item.proposeReason}
                    </td>

                    {/* Số báo cáo */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                        {item.closedReportCount}
                      </span>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-[#5B6776] whitespace-nowrap">
                      {item.createdAt ? formatDateTime(item.createdAt) : '—'}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'PENDING' && (
                        <Badge variant="warning">Chờ xử lý</Badge>
                      )}
                      {item.status === 'BANNED' && (
                        <Badge variant="error">Đã khóa</Badge>
                      )}
                      {item.status === 'DISMISSED' && (
                        <Badge variant="neutral">Đã bỏ qua</Badge>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-6 text-right align-middle whitespace-nowrap">
                      <TableActionButton
                        action="view"
                        onClick={() => handleInspectProposal(item)}
                      />
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
            className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-[#DDE5D9] flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[#DDE5D9] pb-4">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-[#DC2626]">
                    Hồ sơ đề xuất khóa tài khoản
                  </span>
                  <h3 className="text-lg font-extrabold text-[#1F2A37] font-heading mt-0.5">
                    {selectedProposal.orgName}
                  </h3>
                  <p className="text-xs text-[#5B6776] font-mono">
                    ID: {selectedProposal.targetId}
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="px-3 py-2 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]">
                      <div className="text-[10px] tracking-wide text-[#5B6776] font-semibold">Loại đối tượng</div>
                      <div className="font-semibold text-[#1F2A37]">{TARGET_TYPE_LABEL[selectedProposal.targetType] || selectedProposal.targetType}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]">
                      <div className="text-[10px] tracking-wide text-[#5B6776] font-semibold">Email</div>
                      <div className="font-mono text-[#1F2A37] break-all">{selectedProposal.orgEmail}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]">
                      <div className="text-[10px] tracking-wide text-[#5B6776] font-semibold">Số điện thoại</div>
                      <div className="font-mono text-[#1F2A37]">{selectedProposal.orgPhone}</div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="w-8 h-8 rounded-xl border border-[#DDE5D9] flex items-center justify-center text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Thông tin Đề xuất từ Moderator */}
              <div className="p-4 rounded-2xl bg-[#FEF2F2]/60 border border-[#FECACA] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DC2626] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">report</span>
                    <span>Kiến nghị từ nhân viên: {selectedProposal.moderatorName}{selectedProposal.moderatorEmail !== "—" ? ` (${selectedProposal.moderatorEmail})` : ""}</span>
                  </span>
                  <span className="text-[#5B6776]">
                    {selectedProposal.createdAt ? formatDateTime(selectedProposal.createdAt) : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#FECACA] text-[#1F2A37]">
                  <span className="text-[#5B6776] block text-[11px] mb-0.5">Lý do đề xuất khóa:</span>
                  <strong className="text-xs">"{selectedProposal.proposeReason}"</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5B6776]">
                  <span>Số báo cáo từ thành viên trong đợt này: <strong>{selectedProposal.closedReportCount} báo cáo</strong></span>
                </div>
              </div>

              {/* Thông tin Snapshot Tổ chức (nếu có) */}
              {reportSnapshot && (
                <div className="p-4 rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9] space-y-2 text-xs">
                  <div className="font-bold text-[#1F2A37]">Thông tin Hồ sơ Tổ chức / Nội dung</div>
                  {reportSnapshot.organizationLegalName && (
                    <div>Tên pháp lý: <strong>{reportSnapshot.organizationLegalName}</strong></div>
                  )}
                  {reportSnapshot.organizationDescription && (
                    <div className="text-[#5B6776]">{reportSnapshot.organizationDescription}</div>
                  )}
                </div>
              )}

              {/* Khối Lịch sử vi phạm của Tổ chức */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-wider text-[#1F2A37]">
                    Lịch sử bị xử lý vi phạm ({violationHistory.length})
                  </h4>
                  <span className="text-[11px] text-[#5B6776]">
                    Trích xuất từ Nhật ký kiểm duyệt
                  </span>
                </div>

                {historyLoading ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center gap-2 text-xs text-[#5B6776] bg-[#F6F9F4] rounded-xl border border-[#DDE5D9]">
                    <Spinner size="md" />
                    <span>Đang tải lịch sử vi phạm...</span>
                  </div>
                ) : violationHistory.length === 0 ? (
                  <div className="p-4 text-xs text-[#5B6776] bg-[#F6F9F4] rounded-xl border border-[#DDE5D9]">
                    Chỉ ghi nhận lần đề xuất khóa hiện tại ({selectedProposal.proposeReason}).
                  </div>
                ) : (
                  <div className="divide-y divide-[#DDE5D9] border border-[#DDE5D9] rounded-2xl overflow-hidden text-xs">
                    {violationHistory.map((h, i) => (
                      <div key={h.id || i} className="p-3.5 bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1F2A37]">
                            {VIOLATION_ACTION_LABEL[h.action] || h.action}
                          </span>
                          <span className="text-[11px] text-[#5B6776]">
                            {h.date ? formatDateTime(h.date) : '—'}
                          </span>
                        </div>
                        <p className="text-[#5B6776]">
                          Lý do: <span>"{h.reason}"</span>
                        </p>
                        {h.actorName && (
                          <div className="text-[11px] text-[#5B6776]">
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
            <div className="p-5 border-t border-[#DDE5D9] bg-[#F6F9F4] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs font-bold text-[#5B6776] hover:bg-[#F6F9F4] cursor-pointer"
              >
                Đóng
              </button>

              {selectedProposal.status === 'PENDING' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismissProposal(selectedProposal)}
                  >
                    Bỏ qua đề xuất
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleOpenBanModal(selectedProposal)}
                  >
                    Khóa tài khoản ngay
                  </Button>
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
            className="bg-white rounded-2xl border border-[#DDE5D9] max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#1F2A37] font-heading">
                  Xác nhận khóa tài khoản tổ chức?
                </h3>
                <p className="text-xs text-[#5B6776]">
                  Tổ chức: <strong className="text-[#1F2A37]">{banModalTarget.orgName}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed space-y-1">
              <p>
                Khi bị khóa, tài khoản sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức và không thể tiếp tục hoạt động trên nền tảng.
              </p>
              {banPreviewLoading ? (
                <p className="font-semibold">Đang kiểm tra báo cáo và lượt quyên góp liên quan...</p>
              ) : banPreview ? (
                <p className="font-semibold">
                  Sẽ tự đóng <strong>{banPreview.pendingReportCount}</strong> báo cáo đang chờ và tạm giữ{' '}
                  <strong>{banPreview.pendingPickupDonationCount}</strong> lượt quyên góp chờ lấy.
                </p>
              ) : (
                <p className="font-semibold">
                  Các báo cáo đang chờ liên quan đến tổ chức sẽ được đóng tự động và các lượt quyên góp chờ lấy sẽ chuyển sang trạng thái tạm giữ.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A37] mb-1.5">
                Lý do khóa tài khoản <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                rows="3"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do khóa tài khoản..."
                className="w-full p-3 text-xs rounded-xl border border-[#DDE5D9] text-[#1F2A37] focus:outline-none focus:border-[#DC2626] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={banSubmitting}
                onClick={() => setBanModalTarget(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={banSubmitting}
                disabled={banSubmitting}
                onClick={handleConfirmBan}
              >
                {banSubmitting ? 'Đang khóa...' : 'Xác nhận Khóa'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
