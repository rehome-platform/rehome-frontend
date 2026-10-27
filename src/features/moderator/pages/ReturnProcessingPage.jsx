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
} from "../components/returns/ReturnSections.jsx";
import React from "react";
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';

/**
 * Trang Xử Lý Yêu Cầu Trả Hàng & Kiểm Tra Hàng Về Kho
 * Chuẩn hóa 100% theo các wireframe:
 * - TH-01: Hàng đợi yêu cầu trả hàng
 * - TH-02: Chi tiết yêu cầu trả & duyệt form
 * - TH-03: Kiểm tra hàng trả về kho (checklist đối chiếu SKU & ảnh nhập kho)
 * - TH-04: Xử lý món hàng (Đăng bán lại / Trả người ký gửi)
 * - TH-08: Xác nhận hoàn tiền vào ví người mua
 */
export default function ReturnProcessingPage() {
  const model = useReturnProcessing();
  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: QUEUE (TH-01) */}
        {model.viewMode === 'QUEUE' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E2E8E0] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold font-heading text-[#191C19]">
                    Yêu cầu trả hàng
                  </h1>
                </div>
                <p className="text-xs text-[#5f5f5f] mt-1">
                  Sắp theo hạn xử lý, sắp quá hạn lên trước. Người mua đang chờ tiền — để lâu là một khiếu nại.
                </p>
              </div>
              <div className="text-xs text-[#5f5f5f] font-medium">
                Hạn duyệt: 1 ngày làm việc kể từ khi nhận yêu cầu
              </div>
            </div>

            {/* Tabs */}
            <ReturnQueueTabs {...model.sections.ReturnQueueTabs} />

            {/* Bảng TH-01 */}
            <ReturnQueueTable {...model.sections.ReturnQueueTable} />

            {/* Note box TH-01 */}
            <div className="p-3 border border-dashed border-[#9a9a9a] rounded-lg text-xs leading-relaxed text-[#4a4a4a] bg-[#fafafa]">
              Cột <strong className="font-semibold text-[#191C19]">Đã chờ</strong> chỉ đếm ở hai tab đầu — những bước phụ thuộc người mua hoặc đơn vị vận chuyển thì kho không kiểm soát được thời gian, đếm ở đó chỉ gây áp lực sai chỗ.
            </div>
          </div>
        )}

        {/* VIEW 2: CHI TIẾT DUYỆT FORM (TH-02) */}
        {model.viewMode === 'REVIEW' && model.selectedItem && (
          <div className="space-y-4">
            {/* Header TH-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => model.setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-[#191C19]">{model.selectedItem.code}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {model.selectedItem.isOverdue && model.selectedItem.status === 'PENDING_APPROVAL' && (
                  <span className="text-[10px] font-bold px-2 py-1 bg-[#2b2b2b] text-white rounded">
                    QUÁ HẠN DUYỆT 15 GIỜ
                  </span>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#E8F5E9] text-[#006B2C]">
                  {model.selectedItem.carrierStatus}
                </span>
              </div>
            </div>

            {/* Bố cục 2 cột TH-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => model.setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-[#191C19]">
                    {model.selectedItem.code} · kiểm tra hàng về kho
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 border border-[#2b2b2b] rounded bg-white">
                HÀNG VỀ 16/10 10:05
              </span>
            </div>

            {/* Bố cục 2 cột TH-03 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (6 cols): Đối chiếu hàng về */}
              <ReturnInspectionProduct {...model.sections.ReturnInspectionProduct} />

              {/* Cột phải (6 cols): Kết luận & Hoàn tiền */}
              <ReturnInspectionVerdict {...model.sections.ReturnInspectionVerdict} />
            </div>
          </div>
        )}

        {/* MODAL: Từ chối yêu cầu trả (TH-02) */}
        <ReturnRejectDialog {...model.sections.ReturnRejectDialog} />

        {/* MODAL: Xử lý món hàng TH-04 sau khi hoàn tiền */}
        <ReturnOutcomeDialog {...model.sections.ReturnOutcomeDialog} />

        {/* MODAL: So sánh ảnh cạnh nhau */}
        <ReturnCompareDialog {...model.sections.ReturnCompareDialog} />
      </div>
    </ModeratorLayout>
  );
}
