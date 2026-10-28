import { useOrgVerification } from '../hooks/useOrgVerification.jsx';
import {
  VerificationRejectDialog,
  VerificationChecklist,
  VerificationDocuments,
  VerificationLegalChanges,
  VerificationQueueTable,
  VerificationQueueTabs,
} from '../components/verification/VerificationSections.jsx';
import React from "react";
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Modal } from "../../../components/common/index.js";

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
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E2E8E0] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold font-heading text-[#191C19]">
                    Hồ sơ tổ chức chờ xác minh
                  </h1>
                </div>
                <p className="text-xs text-[#5f5f5f] mt-1">
                  Xác minh sai một hồ sơ là một tổ chức giả được phép kêu gọi quyên góp. Không có hạn gấp — làm kỹ hơn làm nhanh.
                </p>
              </div>
              <div className="text-xs text-[#5f5f5f] font-medium">
                Cam kết phản hồi trong 5 ngày làm việc
              </div>
            </div>

            {/* Main Tabs: Hồ sơ mới vs Đổi pháp lý */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => model.setActiveMainTab('NEW_ORGS')}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                  model.activeMainTab === 'NEW_ORGS'
                    ? 'bg-[#006B2C] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                }`}
              >
                Hồ sơ tổ chức ({model.orgsQueue.length})
              </button>
              <button
                type="button"
                onClick={() => model.setActiveMainTab('LEGAL_CHANGES')}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                  model.activeMainTab === 'LEGAL_CHANGES'
                    ? 'bg-[#006B2C] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                }`}
              >
                Yêu cầu đổi pháp lý ({model.legalChanges.filter((c) => c.status === 'PENDING').length})
              </button>
            </div>

            {/* Sub-tabs for NEW_ORGS (TC-01) */}
            {model.activeMainTab === 'NEW_ORGS' && (
              <div className="space-y-4">
                <VerificationQueueTabs {...model.sections.VerificationQueueTabs} />

                {/* Bảng TC-01 */}
                <VerificationQueueTable {...model.sections.VerificationQueueTable} />

                {/* Ghi chú TC-01 */}
                <div className="p-3 border border-dashed border-[#9a9a9a] rounded-lg text-xs leading-relaxed text-[#4a4a4a] bg-[#fafafa]">
                  Cột <strong className="font-semibold text-[#191C19]">Mã số thuế</strong> nằm ngay ở bảng vì nó quyết định cách xác minh: có mã số thuế thì tra được trên cổng thuế nhà nước (bước bắt buộc); không có — câu lạc bộ trường học, chi hội cấp xã — thì phải gọi điện và hỏi cơ quan cấp phép, mất nhiều thời gian hơn.
                </div>
              </div>
            )}

            {/* TAB LEGAL_CHANGES (TC-05) */}
            {model.activeMainTab === 'LEGAL_CHANGES' && (
              <div className="space-y-4">
                <div className="text-xs text-[#5f5f5f]">
                  Tổ chức đã xác minh muốn đổi tên, địa chỉ trụ sở hoặc người đại diện pháp lý
                </div>
                <VerificationLegalChanges legalChanges={model.legalChanges} handleApproveLegalChange={model.handleApproveLegalChange} />
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CHI TIẾT XÁC MINH 8 BƯỚC (TC-02) */}
        {model.viewMode === 'DETAIL' && model.selectedOrg && (
          <div className="space-y-4">
            {/* Header TC-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => model.setViewMode('LIST')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại danh sách"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Hồ sơ tổ chức · </span>
                  <span className="text-sm font-bold text-[#191C19]">
                    {model.selectedOrg.id} · {model.selectedOrg.name}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 border border-[#2b2b2b] rounded bg-white">
                {model.selectedOrg.type.toUpperCase()}
              </span>
            </div>

            {/* Bố cục 2 cột TC-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (5.5 cols): Thông tin tổ chức khai & Tệp đính kèm */}
              <VerificationDocuments selectedOrg={model.selectedOrg} setViewingDoc={model.setViewingDoc} />

              {/* Cột phải (6 cols): Quy trình kiểm chứng & Hành động */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#191C19]">Quy trình kiểm chứng</h2>
                  <p className="text-xs text-[#5f5f5f]">
                    Tích đủ các bước bắt buộc mới bấm Xác thực được.
                  </p>
                </div>

                {/* Checklist TC-02 */}
                <VerificationChecklist {...model.sections.VerificationChecklist} />

                {/* Audit Log Note */}
                <div className="border border-[#c4c4c4] rounded-lg p-3.5 bg-white text-xs space-y-2">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider">
                    Ghi chú xác minh · lưu vào audit log
                  </div>
                  <textarea
                    rows="2"
                    value={model.auditNote}
                    onChange={(e) => model.setAuditNote(e.target.value)}
                    placeholder="Ghi chú chi tiết cuộc gọi, người tiếp chuyện..."
                    className="w-full text-xs p-2 border border-[#8a8a8a] rounded"
                  />
                </div>

                {/* Footer Buttons TC-02 */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    disabled={!model.isChecklistComplete}
                    onClick={model.handleApproveOrg}
                    className={`py-2.5 px-6 rounded text-xs font-bold transition-all ${
                      model.isChecklistComplete
                        ? 'bg-[#2b2b2b] text-white hover:bg-black cursor-pointer'
                        : 'bg-[#efefef] text-[#9a9a9a] border border-[#c4c4c4] cursor-not-allowed'
                    }`}
                  >
                    Xác thực tổ chức
                  </button>
                  <button
                    type="button"
                    onClick={() => model.setIsRejectModalOpen(true)}
                    className="py-2.5 px-4 rounded border border-[#8a8a8a] text-xs font-semibold hover:bg-[#f4f4f4]"
                  >
                    Từ chối kèm lý do
                  </button>
                  {!model.isChecklistComplete && (
                    <span className="text-[11px] text-[#BA1A1A]">
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
        >
          {model.viewingDoc && (
            <div className="space-y-3">
              <div className="text-xs text-[#5f5f5f]">{model.viewingDoc.info}</div>
              <img
                src={model.viewingDoc.url}
                alt={model.viewingDoc.title}
                className="w-full max-h-[480px] object-contain rounded border border-[#c4c4c4] bg-[#f9f9f9]"
              />
              <div className="text-right pt-2">
                <Button size="sm" variant="outline" onClick={() => model.setViewingDoc(null)}>
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
