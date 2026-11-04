import React from "react";
import { Button, Badge, Modal } from "../../../../components/common/index.js";

export function VerificationRejectDialog({ isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmReject }) {
  return (
    <Modal
      isOpen={isRejectModalOpen}
      onClose={() => setIsRejectModalOpen(false)}
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
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Giấy phép hết hiệu lực, ảnh CCCD bị mờ không đọc được số, con dấu không rõ..."
            className="w-full p-2.5 border border-neutral rounded-xl text-text focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => setIsRejectModalOpen(false)} className="rounded-xl">
            Hủy
          </Button>
          <Button size="sm" variant="danger" onClick={handleConfirmReject} className="rounded-xl bg-error text-white hover:bg-red-700">
            Xác nhận từ chối
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
          {missingCccd && (
            <span className="block text-[10px] text-error font-medium mt-1">
              ⚠️ Hồ sơ thiếu ảnh CCCD. Nếu xác thực, hệ thống sẽ từ chối vì chưa đủ hồ sơ tối thiểu. Hãy nhấn &quot;Từ chối kèm lý do&quot; để tổ chức bổ sung.
            </span>
          )}
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error-light text-error border border-error/30">
              Thiếu ảnh CCCD
            </span>
          )}
        </div>
        <p className="text-[11px] text-textSecondary">
          Hai nhóm bắt buộc cho mọi loại tổ chức: 1. Giấy tờ pháp lý tổ chức, 2. Ảnh CCCD người đại diện. Bấm &quot;Xem ảnh&quot; để kiểm tra con dấu và hiệu lực pháp lý.
        </p>
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
                    <div className="text-[10px] text-textSecondary truncate">{docInfo}</div>
                  </div>
                </div>
                {docUrl ? (
                  <button
                    type="button"
                    onClick={() => setViewingDoc({ title: docTitle, info: docInfo, url: docUrl })}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
                  >
                    Xem ảnh
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] text-textSecondary px-2 py-1 bg-neutral-light rounded-lg">Không có tệp</span>
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
                  <div className={`text-[10px] truncate ${cccdFrontUrl ? 'text-textSecondary' : 'text-error font-medium'}`}>
                    {cccdFrontUrl ? (cccdNumber ? `Số CCCD: ${cccdNumber}` : 'Ảnh mặt trước CCCD') : 'Chưa nộp ảnh CCCD mặt trước (bắt buộc)'}
                  </div>
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
                  className="shrink-0 text-xs font-medium px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
                >
                  Xem ảnh
                </button>
              ) : (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg bg-error-light text-error">
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
                  <div className={`text-[10px] truncate ${cccdBackUrl ? 'text-textSecondary' : 'text-error font-medium'}`}>
                    {cccdBackUrl ? (formatRepresentative(rep) !== '—' ? `Người đại diện: ${formatRepresentative(rep)}` : 'Ảnh mặt sau CCCD') : 'Chưa nộp ảnh CCCD mặt sau (bắt buộc)'}
                  </div>
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
                  className="shrink-0 text-xs font-medium px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
                >
                  Xem ảnh
                </button>
              ) : (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg bg-error-light text-error">
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
  return (
    <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-background border-b border-neutral text-[11px] uppercase font-bold text-textSecondary tracking-wider">
              <th className="py-2.5 px-3">Tổ chức</th>
              <th className="py-2.5 px-3">Trường thay đổi</th>
              <th className="py-2.5 px-3">Nội dung cũ → mới</th>
              <th className="py-2.5 px-3">Ngày gửi</th>
              <th className="py-2.5 px-3">Trạng thái</th>
              <th className="py-2.5 px-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral">
            {legalChanges.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-textSecondary">
                  Chưa có yêu cầu đổi pháp lý nào.
                </td>
              </tr>
            ) : (
              legalChanges.map((chg) => (
                <tr key={chg.id} className="hover:bg-background/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-text">{chg.orgName}</td>
                  <td className="py-3 px-3 font-semibold text-primary">{chg.fieldChanged || chg.field}</td>
                  <td className="py-3 px-3">
                    <span className="text-textSecondary line-through mr-2">{chg.oldValue}</span>
                    <span className="font-bold text-text">→ {chg.newValue}</span>
                  </td>
                  <td className="py-3 px-3 text-textSecondary">{chg.submittedAt}</td>
                  <td className="py-3 px-3 font-semibold">
                    {chg.status === 'PENDING' ? (
                      <Badge variant="warning">Chờ duyệt</Badge>
                    ) : (
                      <Badge variant="success">Đã duyệt</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {chg.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => (handleRejectLegalChange ? handleRejectLegalChange(chg.id) : null)}
                          className="text-xs font-medium px-3 py-1.5 rounded-xl bg-error text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveLegalChange(chg.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
                        >
                          Duyệt đổi pháp lý
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VerificationQueueTable({ loading, orgsQueue = [], handleOpenDetail, activeQueueTab = 'PENDING' }) {
  const filteredOrgs = orgsQueue.filter((org) => {
    const status = org.status || 'PENDING';
    if (activeQueueTab === 'PENDING') return status === 'PENDING';
    if (activeQueueTab === 'WAITING_DOCS') return status === 'WAITING_DOCS';
    if (activeQueueTab === 'APPROVED' || activeQueueTab === 'VERIFIED') return status === 'VERIFIED' || status === 'APPROVED';
    if (activeQueueTab === 'REJECTED') return status === 'REJECTED';
    return true;
  });

  return (
    <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-background border-b border-neutral text-[11px] uppercase font-bold text-textSecondary tracking-wider">
              <th className="py-2.5 px-3">Mã hồ sơ</th>
              <th className="py-2.5 px-3">Tên tổ chức</th>
              <th className="py-2.5 px-3">Loại hình</th>
              <th className="py-2.5 px-3">Mã số thuế</th>
              <th className="py-2.5 px-3">Nộp lúc</th>
              <th className="py-2.5 px-3">Đã chờ</th>
              <th className="py-2.5 px-3">Lần nộp</th>
              <th className="py-2.5 px-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral">
            {loading && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-textSecondary">
                  Đang tải danh sách hồ sơ tổ chức...
                </td>
              </tr>
            )}
            {!loading && filteredOrgs.length === 0 && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-textSecondary">
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
                    <td className="py-3 px-3 font-bold text-text">{org.id}</td>
                    <td className="py-3 px-3 font-semibold text-text truncate max-w-[220px]" title={orgName}>
                      {orgName}
                    </td>
                    <td className="py-3 px-3 text-textSecondary">{orgType}</td>
                    <td className="py-3 px-3 font-mono">
                      {org.taxCode && org.taxCode !== 'không có' ? (
                        <span className="font-bold text-primary">{org.taxCode}</span>
                      ) : (
                        <span className="text-textSecondary">{org.taxCode || 'không có'}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-textSecondary">
                      {org.submittedAt || (org.createdAt ? new Date(org.createdAt).toLocaleDateString('vi-VN') : '—')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-text">
                      {org.waitTime || (org.status === 'PENDING' ? 'Chờ duyệt' : '—')}
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(org)}
                        className={`text-xs font-medium px-3.5 py-1.5 rounded-xl transition-colors ${
                          idx === 0
                            ? 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                            : 'border border-neutral text-text hover:bg-background'
                        }`}
                      >
                        Xác minh
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
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
