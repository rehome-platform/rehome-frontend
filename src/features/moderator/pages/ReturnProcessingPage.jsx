import { useReturnProcessing } from '../hooks/useReturnProcessing.jsx';
import {
  ReturnCompareDialog,
  ReturnOutcomeDialog,
  ReturnRejectDialog,
  ReturnInspectionVerdict,
  ReturnInspectionProduct,
  ReturnReviewDecision,
  ReturnRequestDetails,
  ReturnQueueTable,
  ReturnQueueTabs,
  DegradedCaseModal,
  DegradedCaseViewTH07,
} from "../components/returns/ReturnSections.jsx";
import SuspiciousCounterfeitModal from '../components/SuspiciousCounterfeitModal.jsx';
import React from "react";
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';

/**
 * Trang Xử Lý Yêu Cầu Trả Hàng & Kiểm Tra Hàng Về Kho
 * Chuẩn hóa 100% theo các wireframe:
 * - TH-01: Hàng đợi yêu cầu trả hàng
 * - TH-02: Chi tiết yêu cầu trả & duyệt form
 * - TH-03: Kiểm tra hàng trả về kho (checklist đối chiếu SKU & ảnh nhập kho)
 * - TH-04: Xử lý món hàng (Đăng bán lại / Trả người ký gửi / Hàng xuống cấp)
 * - TH-08: Hàng thất lạc & hoàn tiền ví người mua
 * - F-134, F-135: Quy trình hội chẩn 2 Moderator khi nghi hàng giả
 * - Chuẩn hóa theo Design tokens.pdf: #006B2C (primary), #FEA619 (secondary), #DDE5D9 (neutral), #1F2A37 (text), #5B6776 (textSecondary)
 */
export default function ReturnProcessingPage() {
  const model = useReturnProcessing();
  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: QUEUE (TH-01) */}
        {model.viewMode === 'QUEUE' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-neutral pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold font-heading text-text">
                    Yêu cầu trả hàng
                  </h1>
                </div>
                <p className="text-xs text-textSecondary mt-1">
                  Sắp theo hạn xử lý, sắp quá hạn lên trước. Người mua đang chờ tiền — để lâu là một khiếu nại.
                </p>
              </div>
              <div className="text-xs text-textSecondary font-medium">
                Hạn duyệt: 1 ngày làm việc kể từ khi nhận yêu cầu
              </div>
            </div>

            {/* Tabs */}
            <ReturnQueueTabs {...model.sections.ReturnQueueTabs} />

            {/* Bảng TH-01 */}
            <ReturnQueueTable {...model.sections.ReturnQueueTable} />
          </div>
        )}

        {/* VIEW 2: CHI TIẾT DUYỆT FORM (TH-02) */}
        {model.viewMode === 'REVIEW' && model.selectedItem && (
          <div className="space-y-4">
            {/* Header TH-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => model.setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral text-sm text-text hover:bg-background transition-colors"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-textSecondary">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-text">{model.selectedItem.code}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {model.selectedItem.isOverdue && model.selectedItem.status === 'PENDING_APPROVAL' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-secondary text-text rounded-full shadow-sm">
                    QUÁ HẠN DUYỆT 15 GIỜ
                  </span>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success-light text-primary">
                  {model.selectedItem.carrierStatus || 'Chờ xử lý'}
                </span>
              </div>
            </div>

            {/* Bố cục 2 cột TH-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cột trái (7 cols): Người mua nói gì & Ảnh */}
              <ReturnRequestDetails selectedItem={model.selectedItem} setIsCompareModalOpen={model.setIsCompareModalOpen} />

              {/* Cột phải (5 cols): Đơn và món liên quan + Hành động */}
              <ReturnReviewDecision {...model.sections.ReturnReviewDecision} />
            </div>
          </div>
        )}

        {/* VIEW 3: KIỂM TRA HÀNG VỀ KHO (TH-03) */}
        {model.viewMode === 'INSPECT' && model.selectedItem && (
          <div className="space-y-4">
            {/* Header TH-03 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => model.setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral text-sm text-text hover:bg-background transition-colors"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-textSecondary">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-text">
                    {model.selectedItem.code} · kiểm tra hàng về kho
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 border border-neutral rounded-full bg-surface text-text shadow-sm">
                HÀNG VỀ {model.selectedItem.stockInDate || 'Hôm nay'}
              </span>
            </div>

            {/* Bố cục 2 cột TH-03 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cột trái (6 cols): Đối chiếu hàng về */}
              <ReturnInspectionProduct {...model.sections.ReturnInspectionProduct} />

              {/* Cột phải (6 cols): Kết luận & Hoàn tiền */}
              <ReturnInspectionVerdict {...model.sections.ReturnInspectionVerdict} />
            </div>
          </div>
        )}

        {/* VIEW 4: KẾT LUẬN HÀNG XUỐNG CẤP (TH-07) */}
        {model.viewMode === 'DEGRADED_CASE' && model.selectedItem && (
          <DegradedCaseViewTH07 {...model.sections.DegradedCaseViewTH07} />
        )}

        {/* MODAL: Từ chối yêu cầu trả (TH-02) */}
        <ReturnRejectDialog {...model.sections.ReturnRejectDialog} />

        {/* MODAL: Xử lý món hàng TH-04 sau khi hoàn tiền */}
        <ReturnOutcomeDialog {...model.sections.ReturnOutcomeDialog} />

        {/* MODAL: So sánh ảnh cạnh nhau */}
        <ReturnCompareDialog {...model.sections.ReturnCompareDialog} />

        {/* MODAL: Thẩm định hàng nghi giả (F-134, F-135) */}
        <SuspiciousCounterfeitModal {...model.sections.SuspiciousCounterfeitModal} />

        {/* MODAL: Lập biên bản hàng xuống cấp (TH-04 / KG-16) */}
        <DegradedCaseModal {...model.sections.DegradedCaseModal} />
      </div>
    </ModeratorLayout>
  );
}
