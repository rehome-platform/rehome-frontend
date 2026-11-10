import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge } from '../../../components/common/index.js';
import { violationReportService } from '../services/violationReportApi.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { formatDateTime, formatDate } from '../../../utils/formatters.js';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'DISMISSED', label: 'Bác bỏ' },
  { value: 'ALL', label: 'Tất cả trạng thái' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại đối tượng' },
  { value: 'POST', label: 'Bài viết' },
  { value: 'CAMPAIGN', label: 'Chiến dịch' },
  { value: 'ORGANIZATION_ACCOUNT', label: 'Tổ chức' },
];

const TARGET_TYPE_MAP = {
  POST: { label: 'Bài viết', icon: '📄', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  CAMPAIGN: { label: 'Chiến dịch', icon: '🎯', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ORGANIZATION_ACCOUNT: { label: 'Tổ chức', icon: '🏢', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const ACTION_LABEL_MAP = {
  REMOVE_POST: 'Gỡ bài viết vi phạm',
  HIDE_CAMPAIGN: 'Ẩn chiến dịch vi phạm',
  WARN_ORG: 'Cảnh cáo tổ chức',
  PROPOSE_BAN: 'Đề xuất Admin khóa tài khoản',
  DISMISS: 'Bác bỏ báo cáo — Không vi phạm',
};

function getActionOptions(targetType) {
  if (targetType === 'POST') {
    return [
      {
        id: 'REMOVE_POST',
        label: 'Gỡ bài viết',
        desc: 'Chuyển bài viết sang trạng thái REMOVED và ẩn khỏi cộng đồng.',
      },
      {
        id: 'DISMISS',
        label: 'Bác bỏ báo cáo',
        desc: 'Nội dung bài viết hợp lệ, không vi phạm quy chuẩn cộng đồng.',
      },
    ];
  }
  if (targetType === 'CAMPAIGN') {
    return [
      {
        id: 'HIDE_CAMPAIGN',
        label: 'Ẩn chiến dịch',
        desc: 'Chuyển chiến dịch sang trạng thái HIDDEN, tạm dừng tiếp nhận quyên góp.',
      },
      {
        id: 'DISMISS',
        label: 'Bác bỏ báo cáo',
        desc: 'Chiến dịch hợp lệ, minh bạch và đáp ứng tiêu chí nền tảng.',
      },
    ];
  }
  if (targetType === 'ORGANIZATION_ACCOUNT') {
    return [
      {
        id: 'WARN_ORG',
        label: 'Cảnh cáo tổ chức',
        desc: 'Gửi thông báo cảnh cáo vi phạm tới tổ chức. Không thay đổi nội dung.',
      },
      {
        id: 'PROPOSE_BAN',
        label: 'Đề xuất Admin khóa tài khoản',
        desc: 'Chuyển đề xuất tới Admin để khóa tài khoản tổ chức (PROPOSE_BAN).',
      },
      {
        id: 'DISMISS',
        label: 'Bác bỏ báo cáo',
        desc: 'Tổ chức hoạt động hợp lệ, thông tin minh bạch.',
      },
    ];
  }
  return [{ id: 'DISMISS', label: 'Bác bỏ báo cáo', desc: 'Không vi phạm quy định.' }];
}

/**
 * Trang Xử Lý Báo Cáo Vi Phạm & Kiểm Duyệt Nội Dung (Moderator)
 * Chuẩn hóa 100% Real API Backend Spring Boot:
 * - VP-01: Hàng đợi báo cáo vi phạm gom theo target, lọc status & type, badge số lượng nổi bật
 * - VP-02: Chi tiết báo cáo & quyết định (targetSnapshot, danh sách lý do Member, lịch sử vi phạm tổ chức)
 * - Nút hành động chuẩn theo từng loại đối tượng: REMOVE_POST, HIDE_CAMPAIGN, WARN_ORG, PROPOSE_BAN, DISMISS
 */
export default function ViolationReportsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Danh sách báo cáo đã gom nhóm (VP-01)
  const [reports, setReports] = useState([]);
  const [snapshotsById, setSnapshotsById] = useState({});
  const detailsCacheRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING | RESOLVED | DISMISSED | ALL
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | POST | CAMPAIGN | ORGANIZATION_ACCOUNT

  // View state: 'QUEUE' (VP-01) | 'DETAIL' (VP-02)
  const [viewMode, setViewMode] = useState('QUEUE');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Form xử lý vi phạm trong VP-02
  const [selectedAction, setSelectedAction] = useState('REMOVE_POST');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tải danh sách báo cáo từ API thật GET /violation-reports
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await violationReportService.list({
        status: statusFilter,
        type: typeFilter,
      });
      const list = res?.data || [];
      setReports(list);

      // Làm giàu thông tin hiển thị (tên tổ chức & nội dung tóm tắt) cho các dòng trong hàng đợi VP-01
      if (list.length > 0 && typeof violationReportService.getDetail === 'function') {
        Promise.allSettled(
          list.slice(0, 20).map(async (item) => {
            if (!item?.id) return null;
            const detail = await violationReportService.getDetail(item.id);
            if (detail) {
              detailsCacheRef.current[item.id] = detail;
            }
            return detail?.targetSnapshot ? { id: item.id, snapshot: detail.targetSnapshot } : null;
          })
        ).then((results) => {
          const nextMap = {};
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value?.id && r.value?.snapshot) {
              nextMap[r.value.id] = r.value.snapshot;
            }
          });
          if (Object.keys(nextMap).length > 0) {
            setSnapshotsById((prev) => ({ ...prev, ...nextMap }));
          }
        });
      }
    } catch (err) {
      console.error('Lỗi tải danh sách báo cáo vi phạm:', err);
      setError('Không thể tải danh sách báo cáo vi phạm từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Tải chi tiết 1 báo cáo từ API thật GET /violation-reports/{id}
  const loadDetail = useCallback(async (reportId) => {
    if (!reportId) return;
    try {
      setDetailLoading(true);
      const fetched = await violationReportService.getDetail(reportId);
      const detail = fetched || detailsCacheRef.current[reportId] || null;
      if (fetched) {
        detailsCacheRef.current[reportId] = fetched;
      }
      setSelectedReport(detail);

      // Cài đặt action mặc định theo loại đối tượng
      const defaultOptions = getActionOptions(detail?.targetType);
      if (defaultOptions.length > 0) {
        setSelectedAction(defaultOptions[0].id);
      }
      setActionReason('');
      setViewMode('DETAIL');
    } catch (err) {
      console.error('Lỗi tải chi tiết báo cáo vi phạm:', err);
      toast.error('Không thể tải chi tiết báo cáo vi phạm.');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  // Bắt tham số ?id= trên URL
  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && paramId !== selectedReportId) {
      setSelectedReportId(paramId);
      loadDetail(paramId);
    }
  }, [searchParams, selectedReportId, loadDetail]);

  const handleOpenDetail = (rep) => {
    const reportId = rep?.id;
    if (!reportId) return;
    setSelectedReportId(reportId);
    setSearchParams({ id: reportId });
    loadDetail(reportId);
  };

  const handleBackToQueue = () => {
    setViewMode('QUEUE');
    setSelectedReport(null);
    setSelectedReportId(null);
    setSearchParams({});
    fetchReports();
  };

  // Xác nhận xử lý quyết định vi phạm
  const handleConfirmAction = async () => {
    if (!selectedReport) return;
    const isDismiss = selectedAction === 'DISMISS';

    if (!isDismiss && !actionReason.trim()) {
      toast.warn('Vui lòng nhập lý do xử lý vi phạm.');
      return;
    }

    try {
      setSubmitting(true);
      await violationReportService.resolveViolation(
        selectedReport.id,
        selectedAction,
        actionReason
      );

      const label = ACTION_LABEL_MAP[selectedAction] || selectedAction;
      toast.success(`Đã thực thi [${label}] thành công!`);

      // Tải lại chi tiết để hiển thị kết quả đã xử lý
      await loadDetail(selectedReport.id);
      fetchReports();
    } catch (err) {
      console.error('Lỗi khi xử lý báo cáo vi phạm:', err);
      toast.error(err?.message || 'Có lỗi xảy ra khi xử lý báo cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  const targetSnapshot = selectedReport?.targetSnapshot;
  const history = selectedReport?.organizationViolationHistory;
  const isResolvedOrDismissed = selectedReport?.status === 'RESOLVED' || selectedReport?.status === 'DISMISSED';

  // Gom danh sách tất cả lý do Member đã gửi
  const allReportsList = [];
  if (selectedReport) {
    allReportsList.push({
      id: selectedReport.id,
      reporterId: 'Báo cáo đầu tiên',
      reason: selectedReport.reason,
      createdAt: selectedReport.createdAt,
      isPrimary: true,
    });
    if (Array.isArray(selectedReport.otherReports)) {
      selectedReport.otherReports.forEach((other) => {
        allReportsList.push({
          id: other.id,
          reporterId: other.reporterId,
          reason: other.reason,
          createdAt: other.createdAt,
          isPrimary: false,
        });
      });
    }
  }

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: HÀNG ĐỢI BÁO CÁO (VP-01) */}
        {viewMode === 'QUEUE' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-neutral pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold font-heading text-text">
                    Báo cáo vi phạm nội dung
                  </h1>
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-light text-primary">
                    {reports.length} nhóm
                  </span>
                </div>
                <p className="text-xs text-textSecondary mt-1">
                  Bài viết cộng đồng, chiến dịch quyên góp hoặc hồ sơ tổ chức bị Member báo cáo
                </p>
              </div>

              {/* Bộ lọc trạng thái nhanh */}
              <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 rounded-xl border border-neutral">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === opt.value
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-textSecondary hover:text-text hover:bg-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thanh điều khiển phụ: Lọc theo loại đối tượng & Ghi chú */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-textSecondary whitespace-nowrap">
                  Loại đối tượng:
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-neutral bg-surface text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 px-3.5 rounded-xl border border-neutral bg-background text-xs text-textSecondary flex items-center gap-2">
                <span className="text-amber-500 font-bold">ℹ</span>
                <span>Hệ thống tự động gom các báo cáo trùng cùng một đối tượng để kiểm duyệt trong 1 lượt.</span>
              </div>
            </div>

            {/* Bảng Hàng đợi VP-01 */}
            <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background border-b border-neutral text-[11px] uppercase font-semibold text-textSecondary tracking-wider">
                      <th className="py-3 px-3.5">Loại đối tượng</th>
                      <th className="py-3 px-3.5">Mã đối tượng (Target ID)</th>
                      <th className="py-3 px-3.5 text-center">Số lượt báo cáo</th>
                      <th className="py-3 px-3.5">Lý do báo cáo mẫu</th>
                      <th className="py-3 px-3.5">Báo cáo gần nhất</th>
                      <th className="py-3 px-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral">
                    {loading && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-textSecondary">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Đang nạp dữ liệu báo cáo vi phạm từ máy chủ...</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && error && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-error">
                          {error}
                        </td>
                      </tr>
                    )}

                    {!loading && !error && reports.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-textSecondary">
                          Không có báo cáo vi phạm nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !error &&
                      reports.map((rep) => {
                        const isHighPriority = rep.reportCount >= 3;
                        const typeInfo = TARGET_TYPE_MAP[rep.targetType] || {
                          label: rep.targetType,
                          icon: '📌',
                          color: 'bg-neutral-light text-textSecondary',
                        };

                        return (
                          <tr
                            key={rep.id}
                            onClick={() => handleOpenDetail(rep)}
                            className={`cursor-pointer hover:bg-background/80 transition-colors ${
                              isHighPriority ? 'bg-error-light/5 border-l-4 border-l-error' : ''
                            }`}
                          >
                            {/* Loại đối tượng */}
                            <td className="py-3.5 px-3.5 font-semibold">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeInfo.color}`}
                              >
                                <span>{typeInfo.icon}</span>
                                <span>{typeInfo.label}</span>
                              </span>
                            </td>

                            {/* Mã đối tượng & Thông tin tóm tắt */}
                            <td className="py-3.5 px-3.5 text-text">
                              {snapshotsById[rep.id]?.organizationDisplayName && (
                                <span className="block font-bold text-text text-xs mb-0.5">
                                  {snapshotsById[rep.id].organizationDisplayName}
                                </span>
                              )}
                              {(snapshotsById[rep.id]?.postContent ||
                                snapshotsById[rep.id]?.campaignTitle ||
                                snapshotsById[rep.id]?.organizationLegalName) && (
                                <span className="block text-[11px] text-textSecondary max-w-xs truncate mb-0.5">
                                  {snapshotsById[rep.id].postContent ||
                                    snapshotsById[rep.id].campaignTitle ||
                                    snapshotsById[rep.id].organizationLegalName}
                                </span>
                              )}
                              <span className="font-mono font-semibold text-[11px]" title={rep.targetId}>
                                #{String(rep.targetId).substring(0, 8).toUpperCase()}...
                              </span>
                              <span className="ml-1.5 text-[10px] text-textSecondary font-sans">
                                ({rep.targetType})
                              </span>
                            </td>

                            {/* Số lượt báo cáo gom nhóm */}
                            <td className="py-3.5 px-3.5 text-center">
                              <span
                                className={`inline-flex items-center justify-center font-bold px-3 py-1 rounded-full text-xs shadow-2xs ${
                                  isHighPriority
                                    ? 'bg-error text-white animate-pulse'
                                    : 'border border-neutral bg-background text-text'
                                }`}
                              >
                                {rep.reportCount} báo cáo
                              </span>
                            </td>

                            {/* Lý do báo cáo mẫu */}
                            <td className="py-3.5 px-3.5 text-textSecondary max-w-xs truncate" title={rep.sampleReason}>
                              "{rep.sampleReason || 'Không có mô tả chi tiết'}"
                            </td>

                            {/* Thời gian */}
                            <td className="py-3.5 px-3.5 text-textSecondary whitespace-nowrap">
                              {rep.latestReportedAt ? formatDateTime(rep.latestReportedAt) : '—'}
                            </td>

                            {/* Nút xử lý */}
                            <td className="py-3.5 px-3.5 text-right">
                              <span className="inline-flex items-center justify-center text-xs font-bold px-3.5 py-1.5 rounded-xl border border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-xs">
                                Xem & Quyết định →
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CHI TIẾT BÁO CÁO & XỬ LÝ (VP-02) */}
        {viewMode === 'DETAIL' && (
          <div className="space-y-5">
            {/* Header VP-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToQueue}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral text-sm hover:bg-background text-text transition-colors cursor-pointer"
                  title="Quay lại danh sách hàng đợi"
                >
                  ←
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-textSecondary">Kiểm duyệt vi phạm · </span>
                    <span className="text-base font-bold font-heading text-text">
                      Chi tiết báo cáo & quyết định (VP-02)
                    </span>
                  </div>
                  {selectedReport && (
                    <span className="text-xs text-textSecondary font-mono">
                      Mã đối tượng: {selectedReport.targetId}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              {selectedReport?.status === 'RESOLVED' && (
                <Badge variant="success">ĐÃ XỬ LÝ (RESOLVED)</Badge>
              )}
              {selectedReport?.status === 'DISMISSED' && (
                <Badge variant="neutral">ĐÃ BÁC BỎ (DISMISSED)</Badge>
              )}
              {selectedReport?.status === 'PENDING' && (
                <Badge variant="warning">CHỜ XỬ LÝ (PENDING)</Badge>
              )}
            </div>

            {detailLoading && (
              <div className="py-20 text-center text-textSecondary">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải thông tin chi tiết nội dung bị báo cáo...</span>
                </div>
              </div>
            )}

            {!detailLoading && selectedReport && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ================= CỘT TRÁI (7 cols): Nội dung snapshot, Các lý do, Lịch sử vi phạm ================= */}
                <div className="lg:col-span-7 space-y-5">
                  {/* 1. KHỐI NỘI DUNG BỊ BÁO CÁO (TARGET SNAPSHOT) */}
                  <div className="border border-neutral rounded-2xl p-5 bg-surface shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral pb-2.5">
                      <div className="text-xs font-bold font-heading uppercase text-text tracking-wider flex items-center gap-2">
                        <span>{TARGET_TYPE_MAP[selectedReport.targetType]?.icon}</span>
                        <span>Nội dung bị báo cáo ({TARGET_TYPE_MAP[selectedReport.targetType]?.label})</span>
                      </div>
                      {targetSnapshot?.organizationDisplayName && (
                        <span className="text-xs text-textSecondary">
                          Tổ chức: <strong className="text-text">{targetSnapshot.organizationDisplayName}</strong>
                        </span>
                      )}
                    </div>

                    {/* Snapshot cho POST (Bài viết) */}
                    {selectedReport.targetType === 'POST' && (
                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-background border border-neutral text-text whitespace-pre-wrap leading-relaxed">
                          {targetSnapshot?.postContent || 'Bài viết không có nội dung văn bản.'}
                        </div>

                        {targetSnapshot?.postPhotoUrls && targetSnapshot.postPhotoUrls.length > 0 && (
                          <div>
                            <span className="block font-bold text-text mb-2">
                              Hình ảnh đính kèm ({targetSnapshot.postPhotoUrls.length}):
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {targetSnapshot.postPhotoUrls.map((imgUrl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setPreviewImage(imgUrl)}
                                  className="relative aspect-square rounded-xl overflow-hidden border border-neutral bg-neutral-light hover:opacity-90 transition-opacity cursor-pointer group"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Ảnh ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/150?text=Ảnh+lỗi';
                                    }}
                                  />
                                  <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                                    Xem to
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-textSecondary text-[11px] pt-1">
                          <span>Trạng thái bài viết: <strong className="text-text">{targetSnapshot?.postStatus || '—'}</strong></span>
                          <span>Mã bài viết: <span className="font-mono">{selectedReport.targetId}</span></span>
                        </div>
                      </div>
                    )}

                    {/* Snapshot cho CAMPAIGN (Chiến dịch) */}
                    {selectedReport.targetType === 'CAMPAIGN' && (
                      <div className="space-y-3 text-xs">
                        {targetSnapshot?.campaignCoverUrl && (
                          <div className="relative h-44 rounded-xl overflow-hidden border border-neutral bg-neutral-light">
                            <img
                              src={targetSnapshot.campaignCoverUrl}
                              alt="Ảnh bìa chiến dịch"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/600x200?text=Ảnh+bìa+lỗi';
                              }}
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-bold text-text mb-1">
                            {targetSnapshot?.campaignTitle || 'Chưa cập nhật tiêu đề chiến dịch'}
                          </h3>
                          <p className="text-textSecondary leading-relaxed whitespace-pre-wrap">
                            {targetSnapshot?.campaignDescription || 'Không có mô tả chiến dịch.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-textSecondary text-[11px] pt-2 border-t border-neutral">
                          <span>Trạng thái chiến dịch: <strong className="text-text">{targetSnapshot?.campaignStatus || '—'}</strong></span>
                          <span>Mã chiến dịch: <span className="font-mono">{selectedReport.targetId}</span></span>
                        </div>
                      </div>
                    )}

                    {/* Snapshot cho ORGANIZATION_ACCOUNT (Hồ sơ tổ chức) */}
                    {selectedReport.targetType === 'ORGANIZATION_ACCOUNT' && (
                      <div className="space-y-4 text-xs">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-neutral bg-background shrink-0 flex items-center justify-center">
                            {targetSnapshot?.organizationLogoUrl ? (
                              <img
                                src={targetSnapshot.organizationLogoUrl}
                                alt="Logo tổ chức"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">🏢</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-text">
                              {targetSnapshot?.organizationDisplayName || 'Tổ chức chưa đặt tên'}
                            </h3>
                            <div className="text-textSecondary">
                              Tên pháp lý: <strong className="text-text">{targetSnapshot?.organizationLegalName || '—'}</strong>
                            </div>
                            <div className="text-textSecondary">
                              Trạng thái xác thực:{' '}
                              <Badge variant={targetSnapshot?.organizationVerificationStatus === 'VERIFIED' ? 'success' : 'neutral'}>
                                {targetSnapshot?.organizationVerificationStatus || 'UNVERIFIED'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {targetSnapshot?.organizationDescription && (
                          <div className="p-3 rounded-xl bg-background border border-neutral text-textSecondary">
                            {targetSnapshot.organizationDescription}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. KHỐI TẤT CẢ CÁC LÝ DO BÁO CÁO MEMBER GỬI */}
                  <div className="border border-neutral rounded-2xl overflow-hidden bg-surface text-xs shadow-xs">
                    <div className="p-3.5 bg-background border-b border-neutral flex items-center justify-between">
                      <div className="font-bold text-text flex items-center gap-2">
                        <span>📢</span>
                        <span>Danh sách các lượt báo cáo từ Member ({allReportsList.length})</span>
                      </div>
                      <span className="text-[11px] text-textSecondary">
                        Đã gom từ cùng 1 đối tượng
                      </span>
                    </div>

                    <div className="divide-y divide-neutral max-h-60 overflow-y-auto">
                      {allReportsList.map((item, idx) => (
                        <div key={item.id || idx} className="p-3.5 space-y-1 hover:bg-background/40 transition-colors">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-text">
                              {item.isPrimary ? '🌟 Báo cáo gốc' : `Báo cáo viên #${String(item.reporterId).substring(0, 8)}`}
                            </span>
                            <span className="text-textSecondary">
                              {item.createdAt ? formatDateTime(item.createdAt) : '—'}
                            </span>
                          </div>
                          <p className="text-text text-xs italic bg-surface p-2 rounded-lg border border-neutral/60">
                            "{item.reason}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. KHỐI LỊCH SỬ VI PHẠM CỦA TỔ CHỨC */}
                  <div className="border border-neutral rounded-2xl overflow-hidden bg-surface text-xs shadow-xs">
                    <div className="p-3.5 bg-background border-b border-neutral flex items-center justify-between">
                      <div className="font-bold text-text flex items-center gap-2">
                        <span>⚖️</span>
                        <span>Lịch sử vi phạm của tổ chức</span>
                      </div>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          (history?.totalViolationCount ?? 0) > 0
                            ? 'bg-error-light text-error border border-error/30'
                            : 'bg-success-light text-success border border-success/30'
                        }`}
                      >
                        {history?.totalViolationCount ?? 0} lần vi phạm trước đây
                      </span>
                    </div>

                    <div className="p-3.5">
                      {history?.actions && history.actions.length > 0 ? (
                        <div className="divide-y divide-neutral border border-neutral rounded-xl overflow-hidden">
                          {history.actions.map((act, idx) => (
                            <div key={idx} className="p-3 space-y-1 bg-surface">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-text flex items-center gap-1.5">
                                  <Badge variant="error">
                                    {ACTION_LABEL_MAP[act.action] || act.action}
                                  </Badge>
                                  <span className="text-textSecondary font-normal">
                                    ({TARGET_TYPE_MAP[act.targetType]?.label || act.targetType})
                                  </span>
                                </span>
                                <span className="text-[11px] text-textSecondary">
                                  {act.date ? formatDateTime(act.date) : '—'}
                                </span>
                              </div>
                              <p className="text-textSecondary text-[11px]">
                                Lý do xử lý: <strong className="text-text">{act.reason || '—'}</strong>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-textSecondary bg-background rounded-xl border border-neutral">
                          <span className="text-success font-bold">✓ Hồ sơ tốt:</span> Tổ chức chưa có tiền sử vi phạm nào trước đây.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HỘP HIỂN THỊ KẾT QUẢ ĐÃ XỬ LÝ (NẾU ĐÃ RESOLVED / DISMISSED) */}
                  {isResolvedOrDismissed && (
                    <div className="border border-success/30 bg-success-light/30 rounded-2xl p-4 text-xs space-y-2">
                      <div className="font-bold text-success flex items-center gap-2">
                        <span>✓</span>
                        <span>
                          {selectedReport.status === 'RESOLVED'
                            ? 'Báo cáo vi phạm này đã được xử lý (RESOLVED)'
                            : 'Báo cáo vi phạm này đã bị bác bỏ (DISMISSED)'}
                        </span>
                      </div>
                      <div className="space-y-1 text-textSecondary">
                        <div>
                          Biện pháp đã áp dụng:{' '}
                          <strong className="text-text">
                            {ACTION_LABEL_MAP[selectedReport.resolutionAction] || selectedReport.resolutionAction || 'Bác bỏ'}
                          </strong>
                        </div>
                        <div>
                          Căn cứ / Lý do của Moderator:{' '}
                          <span className="text-text italic">
                            "{selectedReport.resolutionReason || 'Không có ghi chú'}"
                          </span>
                        </div>
                        {selectedReport.resolvedAt && (
                          <div>
                            Thời điểm giải quyết: {formatDateTime(selectedReport.resolvedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ================= CỘT PHẢI (5 cols): Chọn hành động xử lý ================= */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="border border-neutral rounded-2xl p-5 bg-surface space-y-4 shadow-xs sticky top-4">
                    <div className="flex items-center justify-between border-b border-neutral pb-2.5">
                      <div className="text-xs font-bold font-heading text-text uppercase tracking-wider">
                        Quyết định xử lý (Moderator)
                      </div>
                      <span className="text-[11px] text-textSecondary font-semibold">
                        {TARGET_TYPE_MAP[selectedReport.targetType]?.label}
                      </span>
                    </div>

                    {isResolvedOrDismissed ? (
                      <div className="p-4 rounded-xl bg-background border border-neutral text-xs text-textSecondary text-center space-y-2">
                        <span>🔒 Đối tượng này đã được quyết định xử lý xong.</span>
                        <p className="text-[11px]">
                          Mọi báo cáo PENDING cùng đối tượng đã được đóng tự động.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleBackToQueue}
                          className="mt-2 w-full"
                        >
                          Quay lại danh sách hàng đợi
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Radio options theo đúng targetType */}
                        <div className="space-y-2.5 text-xs">
                          {getActionOptions(selectedReport.targetType).map((opt) => (
                            <label
                              key={opt.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                selectedAction === opt.id
                                  ? 'border-primary bg-primary/5 text-primary shadow-2xs'
                                  : 'border-neutral hover:bg-background text-text'
                              }`}
                            >
                              <input
                                type="radio"
                                name="violationAction"
                                value={opt.id}
                                checked={selectedAction === opt.id}
                                onChange={() => setSelectedAction(opt.id)}
                                className="mt-0.5 text-primary focus:ring-primary"
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold block text-text">{opt.label}</span>
                                <span className="text-[11px] text-textSecondary block leading-relaxed">
                                  {opt.desc}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Ô nhập lý do xử lý */}
                        <div>
                          <label className="block text-[11px] font-bold text-text mb-1.5">
                            Lý do xử lý{' '}
                            {selectedAction === 'DISMISS' ? (
                              <span className="font-normal text-textSecondary">(Tùy chọn khi bác bỏ)</span>
                            ) : (
                              <span className="text-error font-bold">* Bắt buộc</span>
                            )}
                          </label>
                          <textarea
                            rows="4"
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder={
                              selectedAction === 'DISMISS'
                                ? 'Nhập ghi chú bác bỏ nếu có (mặc định: Nội dung không vi phạm)...'
                                : 'Nhập căn cứ xử lý vi phạm gửi cho tổ chức / lưu vào hồ sơ kiểm toán...'
                            }
                            className="w-full text-xs p-3 border border-neutral rounded-xl text-text focus:outline-none focus:border-primary transition-colors resize-none shadow-2xs"
                          />
                        </div>

                        {/* Cảnh báo tác vụ */}
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                          ⚠️ <strong>Lưu ý:</strong> Hành động này sẽ tự động đóng toàn bộ {allReportsList.length} báo cáo đang chờ xử lý của đối tượng này.
                        </div>

                        {/* Nút xác nhận */}
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleConfirmAction}
                          className="w-full py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Đang gửi quyết định lên hệ thống...</span>
                            </>
                          ) : (
                            <span>Xác nhận quyết định xử lý</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL XEM ẢNH FULL SIZE */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm font-bold hover:bg-black transition-colors z-10 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Ảnh phóng to"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </ModeratorLayout>
  );
}
