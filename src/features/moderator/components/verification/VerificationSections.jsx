import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button, Badge, Modal, TableActionButton } from "../../../../components/common/index.js";
import Spinner from "../../../../components/common/Spinner.jsx";
import { useToast } from "../../../../context/ToastContext.jsx";
import baseApi from "../../../../services/baseApi.js";
import { API_BASE_URL } from "../../../../configs/api.config.js";
import { TABLE_COLUMN_LABELS } from "../../../../constants/tableColumns.js";

gsap.registerPlugin(useGSAP);

function resolveLegalChangeDocUrl(change) {
  if (!change) return null;
  const direct =
    change.documentUrl ||
    change.fileUrl ||
    change.legalFileUrl ||
    change.attachmentUrl ||
    change.documents?.[0]?.url ||
    change.documents?.[0]?.fileUrl;
  if (direct) return direct;

  const orgId = change.organizationId || change.orgId;
  const fileKey = change.fileName || change.legalFileName || change.documentId || change.fileId || change.requestId || change.id;
  if (orgId && fileKey) {
    return `/api/organizations/${encodeURIComponent(orgId)}/legal-files/${encodeURIComponent(fileKey)}`;
  }
  return null;
}

function isProtectedLegalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return false;
  if (url.startsWith('/') || url.startsWith('api/')) return true;
  if (url.includes('/legal-files/') || url.includes('/api/organizations/')) return true;
  if (API_BASE_URL && url.startsWith(API_BASE_URL)) return true;
  return false;
}

function LegalDocumentPreviewModal({ doc, onClose }) {
  const containerRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useGSAP(
    () => {
      if (!doc || !containerRef.current) return;
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          containerRef.current,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'transform,opacity,visibility' }
        );
      });
      return () => mm.revert();
    },
    { dependencies: [doc], scope: containerRef, revertOnUpdate: true }
  );

  useEffect(() => {
    if (!doc?.url) {
      setBlobUrl(null);
      setIsPdf(false);
      setError(false);
      setLoading(false);
      return;
    }

    let active = true;
    let createdObjectUrl = null;
    const lowerUrl = String(doc.url).toLowerCase();
    const likelyPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf');

    if (!isProtectedLegalUrl(doc.url)) {
      setBlobUrl(doc.url);
      setIsPdf(likelyPdf);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    baseApi
      .get(doc.url, { responseType: 'blob' })
      .then(async (res) => {
        if (!active) return;
        const blob = res.data;
        const contentType = (res.headers?.['content-type'] || blob?.type || '').toLowerCase();
        if (contentType.includes('application/json')) {
          setError(true);
          return;
        }
        setIsPdf(contentType.includes('application/pdf') || likelyPdf);
        createdObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(createdObjectUrl);
      })
      .catch(() => {
        if (active) setError(true);
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
  }, [doc?.url, reloadKey]);

  if (!doc) return null;

  return (
    <Modal isOpen={!!doc} onClose={onClose} title={doc.title || 'Tài liệu pháp lý đính kèm'} size="xl">
      <div ref={containerRef} className="space-y-4 text-xs font-sans">
        {loading ? (
          <div className="w-full h-72 flex flex-col items-center justify-center rounded-xl border border-neutral bg-background text-textSecondary gap-3">
            <Spinner size="md" />
            <span className="font-medium">Đang tải tài liệu bảo mật...</span>
          </div>
        ) : error || !blobUrl ? (
          <div className="w-full min-h-56 flex flex-col items-center justify-center rounded-xl border border-neutral bg-background text-textSecondary p-6 text-center gap-3">
            <span className="font-bold text-sm text-text">Không thể hiển thị tài liệu</span>
            <span className="text-[12px] text-textSecondary max-w-sm">
              Tệp không tồn tại, phiên làm việc hết hạn hoặc định dạng không được hỗ trợ.
            </span>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              Thử tải lại
            </button>
          </div>
        ) : isPdf ? (
          <div className="w-full h-[520px] rounded-xl overflow-hidden border border-neutral bg-neutral-light">
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0`}
              title={doc.title || 'Tài liệu PDF'}
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-neutral bg-background overflow-hidden min-h-[280px] max-h-[520px]">
            <img
              src={blobUrl}
              alt={doc.title || 'Tài liệu pháp lý'}
              className="w-full max-h-[480px] object-contain rounded-xl"
              onError={() => setError(true)}
            />
          </div>
        )}
        <div className="flex justify-end pt-2 border-t border-neutral">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function VerificationRejectDialog({ isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmReject, rejectingOrg = false }) {
  return (
    <Modal
      isOpen={isRejectModalOpen}
      onClose={() => { if (!rejectingOrg) setIsRejectModalOpen(false); }}
      title="Từ chối hồ sơ tổ chức"
    >
      <div className="space-y-4 text-xs">
        <p className="text-textSecondary">
          Lý do từ chối sẽ được gửi trực tiếp tới email và thông báo của tổ chức để họ bổ sung nộp lại:
        </p>
        <div>
          <label className="block font-bold text-text mb-1">Lý do từ chối *</label>
          <textarea
            rows="3"
            value={rejectReason}
            disabled={rejectingOrg}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Giấy phép hết hiệu lực, ảnh CCCD bị mờ không đọc được số, con dấu không rõ..."
            className="w-full p-2.5 border border-neutral rounded-xl text-text focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={rejectingOrg} onClick={() => setIsRejectModalOpen(false)} className="rounded-xl">
            Hủy
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={rejectingOrg || !rejectReason.trim()}
            onClick={handleConfirmReject}
            className="rounded-xl bg-error text-white hover:bg-red-700 disabled:opacity-50"
          >
            {rejectingOrg ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function VerificationChecklist({ checklist, setChecklist, isEnterprise, selectedOrg }) {
  const docs = selectedOrg?.documents || [];
  const rep = selectedOrg?.representative;
  const isRepObject = rep && typeof rep === 'object';
  const hasCccdInDocs = docs.some((d) => (d.title || d.docType || '').toLowerCase().includes('cccd'));
  const missingCccd = !hasCccdInDocs && (!isRepObject || !rep.cccdFrontUrl || !rep.cccdBackUrl);

  return (
    <div className="border border-neutral rounded-xl divide-y divide-neutral bg-surface text-xs">
      {/* Bước 1: Tra MST */}
      <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
        <input
          type="checkbox"
          checked={checklist.taxChecked}
          onChange={(e) => setChecklist({ ...checklist, taxChecked: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Tra mã số thuế trên cổng thuế, đối chiếu tên, địa chỉ, tình trạng hoạt động
          </span>
          <span className="block text-[10px] text-textSecondary mt-0.5">
            tracuunnt.gdt.gov.vn · bắt buộc vì tổ chức có MST
          </span>
        </div>
      </label>

      {/* Bước 2: Cổng ĐKKD (cho DNXH) */}
      <label
        className={`p-3 flex items-start gap-3 transition-colors ${
          !isEnterprise ? 'opacity-60 bg-background/50' : 'cursor-pointer hover:bg-background'
        }`}
      >
        <input
          type="checkbox"
          checked={checklist.businessChecked}
          onChange={(e) => setChecklist({ ...checklist, businessChecked: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Đối chiếu trên cổng đăng ký doanh nghiệp
          </span>
          <span className="block text-[10px] text-textSecondary mt-0.5">
            {isEnterprise
              ? 'dangkykinhdoanh.gov.vn · bắt buộc cho Doanh nghiệp xã hội'
              : 'Chỉ áp dụng cho doanh nghiệp xã hội — hồ sơ này không bắt buộc'}
          </span>
        </div>
        {!isEnterprise && (
          <span className="text-[10px] px-2 py-0.5 border border-neutral text-textSecondary rounded-full ml-auto bg-neutral-light">
            không bắt buộc
          </span>
        )}
      </label>

      {/* Bước 3: Kiểm ảnh giấy tờ */}
      <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
        <input
          type="checkbox"
          checked={checklist.docsValid}
          onChange={(e) => setChecklist({ ...checklist, docsValid: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Kiểm ảnh giấy tờ: còn hiệu lực, rõ nét, có ngày cấp và dấu, tên khớp thông tin khai
          </span>
        </div>
      </label>

      {/* Bước 4: Đối chiếu CCCD */}
      <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
        <input
          type="checkbox"
          checked={checklist.cccdMatched}
          onChange={(e) => setChecklist({ ...checklist, cccdMatched: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Đối chiếu tên trên CCCD với tên người đại diện ghi trên giấy phép
          </span>
        </div>
      </label>

      {/* Bước 5: Gọi điện xác nhận */}
      <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
        <input
          type="checkbox"
          checked={checklist.phoneConfirmed}
          onChange={(e) => setChecklist({ ...checklist, phoneConfirmed: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Gọi điện hoặc email tới số công khai của tổ chức, xác nhận đúng họ nộp hồ sơ
          </span>
        </div>
      </label>

      {/* Bước 6: Cơ quan cấp phép */}
      <label className="p-3 flex items-start gap-3 opacity-60 bg-background/50">
        <input
          type="checkbox"
          checked={checklist.authorityChecked}
          onChange={(e) => setChecklist({ ...checklist, authorityChecked: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Gửi văn bản hỏi cơ quan đã cấp phép
          </span>
          <span className="block text-[10px] text-textSecondary mt-0.5">
            Chỉ làm khi nghi ngờ — không bắt buộc
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 border border-neutral text-textSecondary rounded-full ml-auto bg-neutral-light">
          không bắt buộc
        </span>
      </label>

      {/* Bước 7: Báo chí & MXH */}
      <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
        <input
          type="checkbox"
          checked={checklist.reputationChecked}
          onChange={(e) => setChecklist({ ...checklist, reputationChecked: e.target.checked })}
          className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
        />
        <div>
          <span className="font-semibold text-text">
            Tìm tên tổ chức trên báo chí và mạng xã hội xem có dấu hiệu lừa đảo
          </span>
        </div>
      </label>
    </div>
  );
}

export function VerificationDocuments({ selectedOrg, setViewingDoc }) {
  const formatRepresentative = (rep) => {
    if (!rep) return '—';
    if (typeof rep === 'string') return rep;
    return [rep.fullName, rep.position].filter(Boolean).join(' · ') || rep.fullName || '—';
  };

  const orgName = selectedOrg?.legalName || selectedOrg?.name || selectedOrg?.displayName || '—';
  const orgDisplayName = selectedOrg?.displayName || selectedOrg?.legalName || selectedOrg?.name || '—';
  const orgType = selectedOrg?.orgType || selectedOrg?.type || '—';

  const docs = selectedOrg?.documents || [];
  const rep = selectedOrg?.representative;
  const isRepObject = rep && typeof rep === 'object';

  const hasCccdInDocs = docs.some((d) =>
    (d.title || d.docType || '').toLowerCase().includes('cccd')
  );

  const cccdFrontUrl = isRepObject ? rep.cccdFrontUrl : null;
  const cccdBackUrl = isRepObject ? rep.cccdBackUrl : null;
  const cccdNumber = isRepObject ? rep.cccdNumber : null;
  const hasBothCccd = hasCccdInDocs || (Boolean(cccdFrontUrl) && Boolean(cccdBackUrl));

  return (
    <div className="lg:col-span-6 space-y-4 border-r border-neutral pr-0 lg:pr-5">
      <div>
        <h2 className="text-base font-bold font-heading text-text">Thông tin tổ chức khai</h2>
      </div>

      <div className="border border-neutral rounded-xl divide-y divide-neutral bg-surface text-xs">
        {selectedOrg?.id && (
          <div className="p-2.5 flex gap-3">
            <span className="w-28 text-textSecondary shrink-0">Mã hồ sơ</span>
            <span className="font-mono font-semibold text-text break-all">{selectedOrg.id}</span>
          </div>
        )}
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Tên theo giấy tờ</span>
          <span className="font-bold text-text">{orgName}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Tên hiển thị</span>
          <span className="text-text">{orgDisplayName}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Loại hình</span>
          <span className="text-text">{orgType}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Mã số thuế</span>
          <span className="font-bold font-mono text-primary">{selectedOrg?.taxCode || 'không có'}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Phạm vi</span>
          <span className="text-text">{selectedOrg?.scope || 'Toàn quốc'}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Trụ sở</span>
          <span className="leading-relaxed text-text">{selectedOrg?.address || '—'}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Liên hệ</span>
          <span className="text-text">{[selectedOrg?.phone, selectedOrg?.email].filter(Boolean).join(' · ') || '—'}</span>
        </div>
        <div className="p-2.5 flex gap-3">
          <span className="w-28 text-textSecondary shrink-0">Người đại diện</span>
          <span className="font-semibold text-text">{formatRepresentative(selectedOrg?.representative)}</span>
        </div>
      </div>

      {/* Tệp đính kèm */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-heading text-text">Tệp đính kèm</h2>
          {!hasBothCccd && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error-light text-error border border-error/30 whitespace-nowrap">
              Thiếu ảnh CCCD
            </span>
          )}
        </div>
      </div>

      <div className="border border-neutral rounded-xl overflow-hidden bg-surface text-xs divide-y divide-neutral">
        {/* Nhóm 1: Các giấy tờ pháp lý của tổ chức */}
        {docs.length > 0 ? (
          docs.map((doc, idx) => {
            const docTitle = doc.title || doc.docType || `Giấy tờ #${idx + 1}`;
            const docInfo = doc.info || [doc.docNumber, doc.issueDate, doc.issuingAuthority].filter(Boolean).join(' · ') || 'Tài liệu pháp lý';
            const docUrl = doc.url || doc.fileUrl;
            return (
              <div key={`doc-${idx}`} className="p-3 flex items-center justify-between gap-3 hover:bg-background transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    ✓
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-text truncate">{docTitle}</div>
                  </div>
                </div>
                {docUrl ? (
                  <button
                    type="button"
                    onClick={() => setViewingDoc({ title: docTitle, info: docInfo, url: docUrl })}
                    className="shrink-0 whitespace-nowrap text-xs font-medium px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
                  >
                    Xem ảnh
                  </button>
                ) : (
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-textSecondary px-2.5 py-0.5 bg-neutral-light rounded-full">Không có tệp</span>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-textSecondary">Chưa có giấy tờ pháp lý.</div>
        )}

        {/* Nhóm 2: Ảnh CCCD người đại diện (hiển thị khi chưa có trong danh sách docs) */}
        {!hasCccdInDocs && (
          <>
            {/* CCCD mặt trước */}
            <div className={`p-3 flex items-center justify-between gap-3 transition-colors ${!cccdFrontUrl ? 'bg-error/5' : 'hover:bg-background'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${cccdFrontUrl ? 'bg-primary text-white' : 'bg-error text-white'}`}>
                  {cccdFrontUrl ? '✓' : '!'}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-text truncate">CCCD mặt trước (Người đại diện)</div>
                </div>
              </div>
              {cccdFrontUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingDoc({
                    title: 'CCCD mặt trước (Người đại diện)',
                    info: cccdNumber ? `Số CCCD: ${cccdNumber}` : 'CCCD mặt trước',
                    url: cccdFrontUrl
                  })}
                  className="shrink-0 whitespace-nowrap text-xs font-medium px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
                >
                  Xem ảnh
                </button>
              ) : (
                <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-error-light text-error">
                  Thiếu tệp
                </span>
              )}
            </div>

            {/* CCCD mặt sau */}
            <div className={`p-3 flex items-center justify-between gap-3 transition-colors ${!cccdBackUrl ? 'bg-error/5' : 'hover:bg-background'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${cccdBackUrl ? 'bg-primary text-white' : 'bg-error text-white'}`}>
                  {cccdBackUrl ? '✓' : '!'}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-text truncate">CCCD mặt sau (Người đại diện)</div>
                </div>
              </div>
              {cccdBackUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingDoc({
                    title: 'CCCD mặt sau (Người đại diện)',
                    info: formatRepresentative(rep) !== '—' ? `Người đại diện: ${formatRepresentative(rep)}` : 'CCCD mặt sau',
                    url: cccdBackUrl
                  })}
                  className="shrink-0 whitespace-nowrap text-xs font-medium px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
                >
                  Xem ảnh
                </button>
              ) : (
                <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-error-light text-error">
                  Thiếu tệp
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function VerificationLegalChanges({ legalChanges = [], handleApproveLegalChange, handleRejectLegalChange }) {
  const toast = useToast();
  const [selectedChangeModal, setSelectedChangeModal] = React.useState(null);
  const [previewDoc, setPreviewDoc] = React.useState(null);
  const [rejectModalTarget, setRejectModalTarget] = React.useState(null);
  const [legalRejectReason, setLegalRejectReason] = React.useState('');
  const [approveModalTarget, setApproveModalTarget] = React.useState(null);
  const [submittingAction, setSubmittingAction] = React.useState(false);

  const openRejectModal = (chg) => {
    setRejectModalTarget(chg);
    setLegalRejectReason('');
  };

  const confirmRejectLegalChange = async () => {
    if (!rejectModalTarget || submittingAction) return;
    const trimmed = legalRejectReason.trim();
    if (!trimmed) {
      toast.warn('Vui lòng nhập lý do từ chối yêu cầu đổi pháp lý.');
      return;
    }
    const targetRequestId = rejectModalTarget.requestId || rejectModalTarget.refId || rejectModalTarget.id;
    setSubmittingAction(true);
    try {
      const ok = await handleRejectLegalChange?.(targetRequestId, trimmed);
      if (ok !== false) {
        setRejectModalTarget(null);
        setLegalRejectReason('');
        setSelectedChangeModal(null);
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const confirmApproveLegalChange = async () => {
    if (!approveModalTarget || submittingAction) return;
    const targetRequestId = approveModalTarget.requestId || approveModalTarget.refId || approveModalTarget.id;
    setSubmittingAction(true);
    try {
      const ok = await handleApproveLegalChange?.(targetRequestId);
      if (ok !== false) {
        setApproveModalTarget(null);
        setSelectedChangeModal(null);
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-background border-b border-neutral text-xs font-semibold text-textSecondary whitespace-nowrap">
              <th className="py-2.5 px-4 w-1/3">Tên tổ chức</th>
              <th className="py-2.5 px-4">Nội dung chỉnh sửa</th>
              <th className="py-2.5 px-4 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral">
            {legalChanges.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-textSecondary">
                  Chưa có yêu cầu đổi pháp lý nào.
                </td>
              </tr>
            ) : (
              legalChanges.map((chg) => {
                const targetRequestId = chg.requestId || chg.refId || chg.id;
                const changeSummary = `${chg.fieldChanged || chg.field || 'Đổi thông tin pháp lý'}: ${chg.oldValue || '—'} → ${chg.newValue || 'Mới'}`;

                return (
                  <tr key={chg.queueItemId || chg.id} className="hover:bg-background/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-text">
                      <span className="block text-sm">{chg.orgName || chg.name || 'Tổ chức'}</span>
                      {chg.status === 'PENDING' ? (
                        <Badge variant="warning" className="mt-1">Chờ duyệt</Badge>
                      ) : chg.status === 'REJECTED' ? (
                        <Badge variant="danger" className="mt-1">Bị từ chối</Badge>
                      ) : (
                        <Badge variant="success" className="mt-1">Đã duyệt</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-primary">{chg.fieldChanged || chg.field || 'Thông tin pháp lý'}</p>
                      <p className="text-textSecondary text-[11px] mt-0.5 max-w-md truncate" title={changeSummary}>
                        <span className="line-through mr-1.5 opacity-70">{chg.oldValue || 'Cũ'}</span>
                        <strong className="text-text">→ {chg.newValue || 'Mới'}</strong>
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TableActionButton
                          action="view"
                          onClick={() => setSelectedChangeModal(chg)}
                        />
                        {chg.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openRejectModal(chg)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-error bg-white text-error hover:bg-error-light transition-colors"
                            >
                              Từ chối
                            </button>
                            <button
                              type="button"
                              onClick={() => setApproveModalTarget(chg)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
                            >
                              Duyệt đổi pháp lý
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CHI TIẾT YÊU CẦU THAY ĐỔI PHÁP LÝ (Decision 3) */}
      {selectedChangeModal && (
        <Modal
          isOpen={!!selectedChangeModal}
          onClose={() => setSelectedChangeModal(null)}
          title={`Chi tiết yêu cầu đổi pháp lý · ${selectedChangeModal.orgName || 'Tổ chức'}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl border border-neutral bg-background space-y-1.5">
              <div className="flex justify-between">
                <span className="text-textSecondary">Tên tổ chức:</span>
                <span className="font-bold text-text">{selectedChangeModal.orgName || selectedChangeModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Mã số thuế:</span>
                <span className="font-mono font-bold text-primary">{selectedChangeModal.taxCode || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Người gửi yêu cầu:</span>
                <span className="font-medium text-text">{selectedChangeModal.submittedBy || selectedChangeModal.representativeName || 'Người đại diện'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Ngày gửi:</span>
                <span className="text-text">{selectedChangeModal.submittedAt || 'Gần đây'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Trạng thái:</span>
                <span className="font-bold text-primary">
                  {selectedChangeModal.status === 'PENDING'
                    ? 'Chờ duyệt'
                    : selectedChangeModal.status === 'APPROVED'
                      ? 'Đã duyệt'
                      : selectedChangeModal.status === 'REJECTED'
                        ? 'Bị từ chối'
                        : selectedChangeModal.status || '—'}
                </span>
              </div>
            </div>

            {/* Bảng so sánh Cũ vs Mới */}
            <div className="space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-[11px] text-textSecondary">So sánh thông tin thay đổi</span>
              <div className="rounded-xl border border-neutral overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-background text-textSecondary">
                    <tr>
                      <th className="py-2 px-3 text-left w-1/3">Trường thay đổi</th>
                      <th className="py-2 px-3 text-left">Nội dung cũ</th>
                      <th className="py-2 px-3 text-left">Nội dung mới đề xuất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-primary">{selectedChangeModal.fieldChanged || selectedChangeModal.field || 'Thông tin pháp lý'}</td>
                      <td className="py-2.5 px-3 text-textSecondary line-through">{selectedChangeModal.oldValue || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-text bg-success-light/30">{selectedChangeModal.newValue || 'Mới'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tài liệu đính kèm */}
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-textSecondary">Giấy tờ & Tài liệu pháp lý đính kèm</span>
              <div className="p-3 rounded-xl border border-neutral bg-surface flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">description</span>
                  <div>
                    <p className="font-bold text-text">Giấy phép ĐKKD / Quyết định thay đổi</p>
                    <p className="text-[10px] text-textSecondary">Định dạng PDF / Ảnh có công chứng</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = resolveLegalChangeDocUrl(selectedChangeModal);
                    if (!url) {
                      toast.warn('Chưa có đường dẫn tài liệu pháp lý đính kèm.');
                      return;
                    }
                    setPreviewDoc({
                      title: `Tài liệu pháp lý · ${selectedChangeModal.orgName || selectedChangeModal.name || 'Tổ chức'}`,
                      url,
                    });
                  }}
                  className="px-2.5 py-1 text-xs border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-colors"
                >
                  Xem tài liệu
                </button>
              </div>
            </div>

            {/* Footer hành động trong Modal */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral">
              <Button variant="ghost" onClick={() => setSelectedChangeModal(null)} className="rounded-xl">
                Đóng
              </Button>
              {selectedChangeModal.status === 'PENDING' && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="danger-outline"
                    onClick={() => openRejectModal(selectedChangeModal)}
                    className="rounded-xl"
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setApproveModalTarget(selectedChangeModal)}
                    className="rounded-xl font-bold"
                  >
                    Duyệt đổi pháp lý
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL TỪ CHỐI YÊU CẦU ĐỔI PHÁP LÝ */}
      <Modal
        isOpen={Boolean(rejectModalTarget)}
        onClose={() => { if (!submittingAction) setRejectModalTarget(null); }}
        title="Từ chối yêu cầu đổi pháp lý"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-textSecondary">
            Từ chối yêu cầu cập nhật thông tin pháp lý của{' '}
            <strong className="text-text">{rejectModalTarget?.orgName || rejectModalTarget?.name || 'tổ chức này'}</strong>.
            Lý do sẽ được gửi tới tổ chức:
          </p>
          <div>
            <label className="block font-bold text-text mb-1">Lý do từ chối *</label>
            <textarea
              rows="3"
              value={legalRejectReason}
              disabled={submittingAction}
              onChange={(e) => setLegalRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối yêu cầu đổi thông tin pháp lý..."
              className="w-full p-2.5 border border-neutral rounded-xl text-text focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
            <Button
              size="sm"
              variant="outline"
              disabled={submittingAction}
              onClick={() => setRejectModalTarget(null)}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={submittingAction}
              disabled={submittingAction || !legalRejectReason.trim()}
              onClick={confirmRejectLegalChange}
              className="rounded-xl"
            >
              {submittingAction ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL XÁC NHẬN DUYỆT ĐỔI PHÁP LÝ */}
      <Modal
        isOpen={Boolean(approveModalTarget)}
        onClose={() => { if (!submittingAction) setApproveModalTarget(null); }}
        title="Xác nhận duyệt yêu cầu đổi pháp lý"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-textSecondary leading-relaxed">
            Bạn có chắc muốn duyệt thay đổi thông tin pháp lý cho{' '}
            <strong className="text-text">{approveModalTarget?.orgName || approveModalTarget?.name || 'tổ chức này'}</strong>?
            Thông tin mới sẽ được áp dụng ngay lên hồ sơ tổ chức và ghi nhận vào Audit Log.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
            <Button
              size="sm"
              variant="outline"
              disabled={submittingAction}
              onClick={() => setApproveModalTarget(null)}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={submittingAction}
              disabled={submittingAction}
              onClick={confirmApproveLegalChange}
              className="rounded-xl font-bold"
            >
              {submittingAction ? 'Đang duyệt...' : 'Xác nhận duyệt'}
            </Button>
          </div>
        </div>
      </Modal>

      <LegalDocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

export function VerificationQueueTable({ loading, orgsQueue = [], handleOpenDetail, activeQueueTab = 'PENDING' }) {
  const [detailOrg, setDetailOrg] = React.useState(null);

  const filteredOrgs = orgsQueue.filter((org) => {
    const status = org.status || 'PENDING';
    if (activeQueueTab === 'PENDING') return status === 'PENDING';
    if (activeQueueTab === 'WAITING_DOCS') return status === 'WAITING_DOCS';
    if (activeQueueTab === 'APPROVED' || activeQueueTab === 'VERIFIED') return status === 'VERIFIED' || status === 'APPROVED';
    if (activeQueueTab === 'REJECTED') return status === 'REJECTED';
    return true;
  });

  const formatRep = (rep) => {
    if (!rep) return '—';
    if (typeof rep === 'string') return rep;
    return [rep.fullName, rep.position].filter(Boolean).join(' · ') || rep.fullName || '—';
  };

  return (
    <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-background border-b border-neutral text-xs font-semibold text-textSecondary whitespace-nowrap">
              <th className="py-2.5 px-3">Tên tổ chức</th>
              <th className="py-2.5 px-3">Loại hình</th>
              <th className="py-2.5 px-3">Nộp lúc</th>
              <th className="py-2.5 px-3">{TABLE_COLUMN_LABELS.WAITED}</th>
              <th className="py-2.5 px-3">Lần nộp</th>
              <th className="py-2.5 px-3 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral">
            {loading && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-textSecondary">
                  Đang tải danh sách hồ sơ tổ chức...
                </td>
              </tr>
            )}
            {!loading && filteredOrgs.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-textSecondary">
                  Chưa có hồ sơ nào trong mục này.
                </td>
              </tr>
            )}
            {!loading &&
              filteredOrgs.map((org, idx) => {
                const orgName = org.legalName || org.name || org.displayName || org.title || org.refId || '—';
                const orgType = org.orgType || (org.type !== 'ORG_VERIFICATION' ? org.type : 'Tổ chức từ thiện');
                return (
                  <tr
                    key={org.id}
                    className={`hover:bg-background/60 transition-colors ${
                      idx === 0 ? 'border-l-4 border-l-primary bg-background/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-text truncate max-w-[240px]" title={orgName}>
                      {orgName}
                    </td>
                    <td className="py-3 px-3 text-textSecondary whitespace-nowrap">{orgType}</td>
                    <td className="py-3 px-3 text-textSecondary whitespace-nowrap">
                      {org.submittedAt || (org.createdAt ? new Date(org.createdAt).toLocaleDateString('vi-VN') : '—')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-text whitespace-nowrap">
                      {org.waitTime || (org.status === 'PENDING' ? 'Chờ duyệt' : '—')}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={
                          String(org.submissionCount || '').includes('lại')
                            ? 'font-bold text-error'
                            : 'text-textSecondary'
                        }
                      >
                        {org.submissionCount || 'Nộp lần đầu'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <TableActionButton
                          action="view"
                          onClick={() => setDetailOrg(org)}
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(org)}
                          className={`text-xs font-medium px-3.5 py-1.5 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                            idx === 0 && activeQueueTab === 'PENDING'
                              ? 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                              : 'border border-neutral text-text hover:bg-background'
                          }`}
                        >
                          {activeQueueTab === 'PENDING' ? 'Xác minh' : 'Xem hồ sơ'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(detailOrg)}
        onClose={() => setDetailOrg(null)}
        title="Chi tiết hồ sơ tổ chức"
        size="md"
      >
        {detailOrg && (
          <div className="space-y-4 text-xs text-textSecondary font-sans">
            <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3.5 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Mã hồ sơ:</span>
                <span className="font-mono font-bold text-text text-right break-all">{detailOrg.id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Tên theo giấy tờ:</span>
                <span className="font-bold text-text text-right">
                  {detailOrg.legalName || detailOrg.name || detailOrg.displayName || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Tên hiển thị:</span>
                <span className="text-text text-right">
                  {detailOrg.displayName || detailOrg.legalName || detailOrg.name || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Loại hình:</span>
                <span className="text-text text-right">
                  {detailOrg.orgType || (detailOrg.type !== 'ORG_VERIFICATION' ? detailOrg.type : 'Tổ chức từ thiện')}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Mã số thuế:</span>
                <span className="font-mono font-bold text-primary text-right">{detailOrg.taxCode || 'không có'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Phạm vi:</span>
                <span className="text-text text-right">{detailOrg.scope || 'Toàn quốc'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Trụ sở:</span>
                <span className="text-text text-right">{detailOrg.address || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Liên hệ:</span>
                <span className="text-text text-right">
                  {[detailOrg.phone, detailOrg.email].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Người đại diện:</span>
                <span className="font-semibold text-text text-right">{formatRep(detailOrg.representative)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Nộp lúc:</span>
                <span className="text-text text-right">
                  {detailOrg.submittedAt || (detailOrg.createdAt ? new Date(detailOrg.createdAt).toLocaleDateString('vi-VN') : '—')}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Đã chờ:</span>
                <span className="text-text text-right">{detailOrg.waitTime || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Lần nộp:</span>
                <span className="text-text text-right">{detailOrg.submissionCount || 'Nộp lần đầu'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailOrg(null)} className="whitespace-nowrap">
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  const target = detailOrg;
                  setDetailOrg(null);
                  handleOpenDetail(target);
                }}
              >
                {activeQueueTab === 'PENDING' ? 'Xác minh' : 'Mở hồ sơ'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function VerificationQueueTabs({ setActiveQueueTab, activeQueueTab, orgsQueue = [] }) {
  const pendingCount = orgsQueue.filter((o) => (o.status || 'PENDING') === 'PENDING').length;
  const waitingDocsCount = orgsQueue.filter((o) => o.status === 'WAITING_DOCS').length;
  const verifiedCount = orgsQueue.filter((o) => o.status === 'VERIFIED' || o.status === 'APPROVED').length;
  const rejectedCount = orgsQueue.filter((o) => o.status === 'REJECTED').length;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setActiveQueueTab('PENDING')}
        className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
          activeQueueTab === 'PENDING'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
        }`}
      >
        Chờ xác minh · {pendingCount}
      </button>
      <button
        type="button"
        onClick={() => setActiveQueueTab('WAITING_DOCS')}
        className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
          activeQueueTab === 'WAITING_DOCS'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
        }`}
      >
        Đang chờ bổ sung · {waitingDocsCount}
      </button>
      <button
        type="button"
        onClick={() => setActiveQueueTab('APPROVED')}
        className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
          activeQueueTab === 'APPROVED' || activeQueueTab === 'VERIFIED'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
        }`}
      >
        Đã xác thực · {verifiedCount}
      </button>
      <button
        type="button"
        onClick={() => setActiveQueueTab('REJECTED')}
        className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
          activeQueueTab === 'REJECTED'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background hover:text-text'
        }`}
      >
        Đã từ chối · {rejectedCount}
      </button>
    </div>
  );
}

export { ExistingOrganizationsSection } from './ExistingOrganizationsSection.jsx';
