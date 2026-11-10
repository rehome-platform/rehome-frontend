import { useOrgVerification } from '../hooks/useOrgVerification.jsx';
import {
  VerificationRejectDialog,
  VerificationChecklist,
  VerificationDocuments,
  VerificationLegalChanges,
  VerificationQueueTable,
  VerificationQueueTabs,
  ExistingOrganizationsSection,
} from '../components/verification/VerificationSections.jsx';
import React, { useState, useEffect } from "react";
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Modal } from "../../../components/common/index.js";
import baseApi from '../../../services/baseApi.js';
import { API_BASE_URL } from '../../../configs/api.config.js';

function isProtectedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return false;
  if (url.startsWith('/') || url.startsWith('api/')) return true;
  if (url.includes('/legal-files/') || url.includes('/api/organizations/')) return true;
  if (API_BASE_URL && url.startsWith(API_BASE_URL)) return true;
  return false;
}

function AuthenticatedImage({ src, alt, className }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      setIsPdf(false);
      setError(false);
      setLoading(false);
      return;
    }

    let active = true;
    let createdObjectUrl = null;

    const lowerSrc = String(src).toLowerCase();
    const isLikelyPdf = lowerSrc.endsWith('.pdf') || lowerSrc.includes('.pdf');

    if (!isProtectedUrl(src)) {
      setBlobUrl(src);
      setIsPdf(isLikelyPdf);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    baseApi
      .get(src, { responseType: 'blob' })
      .then(async (res) => {
        if (!active) return;
        const blob = res.data;
        const contentType = (res.headers?.['content-type'] || blob?.type || '').toLowerCase();

        if (contentType.includes('application/json')) {
          console.error('Máy chủ trả về dữ liệu JSON thay vì tệp nhị phân:', await blob.text());
          setError(true);
          return;
        }

        const isPdfDocument = contentType.includes('application/pdf') || isLikelyPdf;
        setIsPdf(isPdfDocument);

        createdObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(createdObjectUrl);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Không thể tải tệp hình ảnh bảo mật:', err);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [src, reloadKey]);

  if (loading) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center rounded-xl border border-neutral bg-background text-textSecondary text-xs gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">Đang tải tài liệu bảo mật...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="w-full min-h-56 flex flex-col items-center justify-center rounded-xl border border-neutral bg-background text-textSecondary text-xs p-6 text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center text-lg font-bold">
          !
        </div>
        <div>
          <span className="font-bold text-sm text-text block">Không thể hiển thị tài liệu</span>
          <span className="text-[12px] text-textSecondary mt-1 block max-w-sm">
            Tệp không tồn tại, phiên làm việc hết hạn hoặc định dạng không được hỗ trợ.
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
          >
            Thử tải lại
          </button>
          {src && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral hover:bg-surface text-text transition-colors"
            >
              Mở liên kết gốc ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="space-y-3">
        <div className="w-full h-[520px] rounded-xl overflow-hidden border border-neutral bg-neutral-light">
          <iframe
            src={`${blobUrl}#toolbar=1&navpanes=0`}
            title={alt || 'Tài liệu PDF'}
            className="w-full h-full border-0"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between text-xs text-textSecondary bg-surface p-3 rounded-xl border border-neutral gap-2">
          <span className="flex items-center gap-1.5 font-medium text-text">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Định dạng tài liệu: PDF
          </span>
          <div className="flex items-center gap-3">
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Mở tab mới ↗
            </a>
            <span>·</span>
            <a
              href={blobUrl}
              download={alt ? `${alt}.pdf` : 'tai-lieu.pdf'}
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Tải về máy ⬇
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative group flex items-center justify-center rounded-xl border border-neutral bg-background overflow-hidden min-h-[300px] max-h-[520px]">
        <img
          src={blobUrl}
          alt={alt}
          className={className || "w-full max-h-[480px] object-contain rounded-xl"}
          onError={() => setError(true)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between text-xs text-textSecondary bg-surface p-2.5 rounded-xl border border-neutral gap-2">
        <span className="text-[11px] text-textSecondary">
          Kiểm tra con dấu, chữ ký và thời hạn hiệu lực theo quy trình kiểm chứng
        </span>
        <div className="flex items-center gap-3">
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Mở ảnh tab mới ↗
          </a>
          <span>·</span>
          <a
            href={blobUrl}
            download={alt ? `${alt}.jpg` : 'hinh-anh.jpg'}
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Tải ảnh về ⬇
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang Quản Lý & Xác Minh Hồ Sơ Tổ Chức Từ Thiện
 * Chuẩn hóa 100% theo các wireframe:
 * - TC-01: Hàng đợi hồ sơ tổ chức chờ xác minh
 * - TC-02: Quy trình kiểm chứng 8 bước (chưa đủ nút khóa / đủ nút mở)
 * - TC-03: Modal xem phóng to giấy tờ pháp lý
 * - TC-04: Modal từ chối hồ sơ kèm lý do
 * - TC-05: Hàng đợi yêu cầu đổi thông tin pháp lý
 * - TC-06: Chi tiết đối chiếu & duyệt đổi pháp lý
 */
export default function OrgVerificationPage() {
  const model = useOrgVerification();
  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: QUEUE LIST (TC-01 & TC-05) */}
        {model.viewMode === 'LIST' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-neutral pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold font-heading text-text">
                    Hồ sơ tổ chức chờ xác minh
                  </h1>
                </div>
                <p className="text-xs text-textSecondary mt-1">
                  Xác minh sai một hồ sơ là một tổ chức giả được phép kêu gọi quyên góp. Không có hạn gấp — làm kỹ hơn làm nhanh.
                </p>
              </div>
              <div className="text-xs text-textSecondary font-medium">
                Cam kết phản hồi trong 5 ngày làm việc
              </div>
            </div>

            {/* Main Tabs: Hồ sơ mới vs Đổi pháp lý */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => model.setActiveMainTab('NEW_ORGS')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${model.activeMainTab === 'NEW_ORGS'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
                  }`}
              >
                Hồ sơ tổ chức ({model.orgsQueue.length})
              </button>
              <button
                type="button"
                onClick={() => model.setActiveMainTab('LEGAL_CHANGES')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${model.activeMainTab === 'LEGAL_CHANGES'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
                  }`}
              >
                Yêu cầu đổi pháp lý ({model.legalChanges.filter((c) => c.status === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => model.setActiveMainTab('EXISTING_ORGS')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${model.activeMainTab === 'EXISTING_ORGS'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
                  }`}
              >
                Tổ chức hiện hữu ({model.existingOrgs.length})
              </button>
            </div>

            {/* Sub-tabs for NEW_ORGS (TC-01) */}
            {model.activeMainTab === 'NEW_ORGS' && (
              <div className="space-y-4">
                <VerificationQueueTabs {...model.sections.VerificationQueueTabs} />

                {/* Bảng TC-01 */}
                <VerificationQueueTable {...model.sections.VerificationQueueTable} />
              </div>
            )}

            {/* TAB LEGAL_CHANGES (TC-05) */}
            {model.activeMainTab === 'LEGAL_CHANGES' && (
              <div className="space-y-4">
                <div className="text-xs text-textSecondary">
                  Tổ chức đã xác minh muốn đổi tên, địa chỉ trụ sở hoặc người đại diện pháp lý
                </div>
                <VerificationLegalChanges legalChanges={model.legalChanges} handleApproveLegalChange={model.handleApproveLegalChange} handleRejectLegalChange={model.handleRejectLegalChange} />
              </div>
            )}

            {/* TAB EXISTING_ORGS */}
            {model.activeMainTab === 'EXISTING_ORGS' && (
              <div className="space-y-4">
                <div className="text-xs text-textSecondary">
                  Danh sách các tổ chức từ thiện đã được xác minh và đang hoạt động trên nền tảng
                </div>
                <ExistingOrganizationsSection
                  loading={model.loadingExisting}
                  existingOrgs={model.existingOrgs}
                  onRefresh={() => model.fetchExistingOrgs()}
                />
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CHI TIẾT XÁC MINH 8 BƯỚC (TC-02) */}
        {model.viewMode === 'DETAIL' && model.selectedOrg && (
          <div className="space-y-4">
            {/* Header TC-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => model.setViewMode('LIST')}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral text-sm hover:bg-background text-text transition-colors"
                  title="Quay lại danh sách"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-textSecondary">Hồ sơ tổ chức · </span>
                  <span className="text-sm font-bold font-heading text-text">
                    {model.selectedOrg.id} · {model.selectedOrg.legalName || model.selectedOrg.name}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 border border-neutral rounded-full bg-neutral-light text-primary">
                {String(model.selectedOrg.orgType || model.selectedOrg.type || 'Tổ chức').toUpperCase()}
              </span>
            </div>

            {/* Bố cục 2 cột TC-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (5.5 cols): Thông tin tổ chức khai & Tệp đính kèm */}
              <VerificationDocuments selectedOrg={model.selectedOrg} setViewingDoc={model.setViewingDoc} />

              {/* Cột phải (6 cols): Quy trình kiểm chứng & Hành động */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold font-heading text-text">Quy trình kiểm chứng</h2>
                  <p className="text-xs text-textSecondary">
                    Tích đủ các bước bắt buộc mới bấm Xác thực được.
                  </p>
                </div>

                {/* Checklist TC-02 */}
                <VerificationChecklist {...model.sections.VerificationChecklist} />

                {/* Audit Log Note */}
                <div className="border border-neutral rounded-xl p-3.5 bg-surface text-xs space-y-2">
                  <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                    Ghi chú xác minh · lưu vào audit log
                  </div>
                  <textarea
                    rows="2"
                    value={model.auditNote}
                    onChange={(e) => model.setAuditNote(e.target.value)}
                    placeholder="Ghi chú chi tiết cuộc gọi, người tiếp chuyện..."
                    className="w-full text-xs p-2.5 border border-neutral rounded-xl text-text focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Footer Buttons TC-02 */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    disabled={!model.isChecklistComplete}
                    onClick={model.handleApproveOrg}
                    className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${model.isChecklistComplete
                        ? 'bg-primary text-white hover:bg-primary-hover shadow-sm cursor-pointer'
                        : 'bg-neutral-light text-textSecondary border border-neutral cursor-not-allowed'
                      }`}
                  >
                    Xác thực tổ chức
                  </button>
                  <button
                    type="button"
                    onClick={() => model.setIsRejectModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl border border-error text-error hover:bg-error-light text-xs font-semibold transition-colors"
                  >
                    Từ chối kèm lý do
                  </button>
                  {!model.isChecklistComplete && (
                    <span className="text-xs text-error font-medium">
                      Còn {model.mandatoryItemsLeft} bước bắt buộc chưa tích — nút Xác thực đang khóa
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TC-03: Xem ảnh phóng to giấy tờ */}
        <Modal
          isOpen={!!model.viewingDoc}
          onClose={() => model.setViewingDoc(null)}
          title={model.viewingDoc ? model.viewingDoc.title : 'Xem tài liệu'}
          maxWidth="max-w-4xl"
        >
          {model.viewingDoc && (
            <div className="space-y-3">
              <div className="text-xs text-textSecondary">{model.viewingDoc.info}</div>
              <AuthenticatedImage
                src={model.viewingDoc.url}
                alt={model.viewingDoc.title}
                className="w-full max-h-[480px] object-contain rounded-xl border border-neutral bg-background"
              />
              <div className="text-right pt-2">
                <Button size="sm" variant="outline" onClick={() => model.setViewingDoc(null)} className="rounded-xl">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL TC-04: Từ chối hồ sơ kèm lý do */}
        <VerificationRejectDialog {...model.sections.VerificationRejectDialog} />
      </div>
    </ModeratorLayout>
  );
}
