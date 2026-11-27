import { useReturnProcessing } from '../hooks/useReturnProcessing.jsx';
import { useModerationShortcuts } from '../hooks/useModerationShortcuts.js';
import { WarehouseHistoryTabs } from '../components/WarehouseHistoryTabs.jsx';
import { mapReturnHistoryRow } from '../models/historyTableModel.js';
import {
  ReturnCompareDialog,
  ReturnOutcomeDialog,
  ReturnRejectDialog,
  ReturnMarkLostDialog,
  ReturnInspectionVerdict,
  ReturnInspectionProduct,
  ReturnReviewDecision,
  ReturnRequestDetails,
  ReturnQueueTable,
  ReturnQueueTabs,
  ReturnQuickDetailModal,
  DegradedCaseModal,
  DegradedCaseViewTH07,
} from "../components/returns/ReturnSections.jsx";
import React from "react";
import Button from '../../../components/common/Button.jsx';
import Tooltip from '../../../components/common/Tooltip.jsx';
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
  const returnHistoryRows = React.useMemo(
    () =>
      model.historyRequests.map((r) =>
        mapReturnHistoryRow(r, { onViewDetail: model.setQuickDetailItem }),
      ),
    [model.historyRequests, model.setQuickDetailItem],
  );
  const canReviewShortcuts =
    model.viewMode === 'REVIEW' &&
    model.selectedItem?.status === 'PENDING_APPROVAL' &&
    !model.sections.ReturnRejectDialog?.isRejectModalOpen &&
    !model.sections.ReturnCompareDialog?.isCompareModalOpen;

  useModerationShortcuts({
    enabled: model.viewMode === 'REVIEW' || model.viewMode === 'INSPECT',
    onApprove: canReviewShortcuts ? model.sections.ReturnReviewDecision?.handleApproveAndCreateWaybill : undefined,
    onReject: canReviewShortcuts ? () => model.sections.ReturnReviewDecision?.setIsRejectModalOpen?.(true) : undefined,
    onEscape:
      !model.sections.ReturnRejectDialog?.isRejectModalOpen &&
      !model.sections.ReturnCompareDialog?.isCompareModalOpen &&
      !model.sections.DegradedCaseModal?.isOpen &&
      !model.sections.ReturnOutcomeDialog?.isOutcomeModalOpen
        ? model.handleBackToQueue
        : undefined,
  });

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
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-xs text-textSecondary font-medium">
                  Hạn duyệt: 1 ngày làm việc kể từ khi nhận yêu cầu
                </div>
                <Button
                  variant="outline"
                  loading={model.loading}
                  onClick={() => model.fetchReturns?.({ force: true })}
                  className="whitespace-nowrap"
                >
                  Tải lại
                </Button>
              </div>
            </div>

            {/* Work / History Tabs + Search Filter */}
            <WarehouseHistoryTabs
              tabListLabel="Công việc và lịch sử trả hàng"
              historyCount={model.historyRequests.length}
              tabBarExtra={
                <div className="relative flex-1 max-w-md min-w-[240px]">
                  <input
                    type="text"
                    value={model.searchQuery}
                    onChange={(e) => model.setSearchQuery(e.target.value)}
                    placeholder="Tìm theo mã yêu cầu, mã đơn, Mã hàng hóa hoặc người mua..."
                    className="w-full text-xs py-2 px-3 rounded-xl border border-neutral bg-surface text-text placeholder:text-textSecondary focus:outline-none focus:border-primary"
                  />
                  {model.searchQuery && (
                    <Tooltip content="Xóa từ khóa tìm kiếm" className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        aria-label="Xóa từ khóa tìm kiếm"
                        onClick={() => model.setSearchQuery('')}
                        className="text-textSecondary hover:text-text text-xs p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        ✕
                      </button>
                    </Tooltip>
                  )}
                </div>
              }
              historySource={{
                rows: returnHistoryRows,
                loading: model.loading,
                error: model.error,
                onRefresh: () => model.fetchReturns?.({ force: true }),
                emptyText: 'Chưa có yêu cầu trả hàng nào đã xử lý.',
                sectionLabel: 'Lịch sử xử lý yêu cầu trả hàng',
                pageSize: 20,
              }}
            >
              {!model.loading && model.error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center justify-between gap-3">
                  <span>{model.error}</span>
                  <Button variant="outline" size="sm" onClick={() => model.fetchReturns?.({ force: true })}>
                    Thử lại
                  </Button>
                </div>
              )}

              {/* Tabs */}
              <ReturnQueueTabs {...model.sections.ReturnQueueTabs} />

              {/* Bảng TH-01 */}
              <ReturnQueueTable {...model.sections.ReturnQueueTable} />
            </WarehouseHistoryTabs>
          </div>
        )}

        {/* VIEW 2: CHI TIẾT DUYỆT FORM (TH-02) */}
        {model.viewMode === 'REVIEW' && model.selectedItem && (
          <div className="space-y-4">
            {/* Header TH-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral pb-3">
              <div className="flex items-center gap-3">
                <Tooltip content="Quay lại hàng đợi" shortcut="Esc">
                  <button
                    type="button"
                    aria-label="Quay lại hàng đợi"
                    title="Quay lại hàng đợi"
                    onClick={model.handleBackToQueue}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral text-sm text-text hover:bg-background transition-colors"
                  >
                    ←
                  </button>
                </Tooltip>
                <div>
                  <span className="text-xs text-textSecondary">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-text">{model.selectedItem.code}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {model.selectedItem.isOverdue && model.selectedItem.status === 'PENDING_APPROVAL' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-secondary text-text rounded-full shadow-sm">
                    QUÁ HẠN DUYỆT
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
                <Tooltip content="Quay lại hàng đợi" shortcut="Esc">
                  <button
                    type="button"
                    aria-label="Quay lại hàng đợi"
                    title="Quay lại hàng đợi"
                    onClick={model.handleBackToQueue}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral text-sm text-text hover:bg-background transition-colors"
                  >
                    ←
                  </button>
                </Tooltip>
                <div>
                  <span className="text-xs text-textSecondary">Yêu cầu trả hàng · </span>
                  <span className="text-sm font-bold text-text">
                    {model.selectedItem.code} · kiểm tra hàng về điểm kí gửi
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

              {/* Cột phải (6 cols): Kết luận & Hoàn tiền (ẩn nhánh nghi hàng giả theo C.1 #4 do BE chưa có API) */}
              <ReturnInspectionVerdict
                {...model.sections.ReturnInspectionVerdict}
                handleFlagCounterfeit={null}
              />
            </div>
          </div>
        )}

        {/* VIEW 4: KẾT LUẬN HÀNG XUỐNG CẤP (TH-07) */}
        {model.viewMode === 'DEGRADED_CASE' && model.selectedItem && (
          <DegradedCaseViewTH07 {...model.sections.DegradedCaseViewTH07} />
        )}

        {/* MODAL: Từ chối yêu cầu trả (TH-02) */}
        <ReturnRejectDialog {...model.sections.ReturnRejectDialog} />

        {/* MODAL: Xác nhận bưu kiện thất lạc (TH-08) */}
        <ReturnMarkLostDialog {...model.sections.ReturnMarkLostDialog} />

        {/* MODAL: Xử lý món hàng TH-04 sau khi hoàn tiền */}
        <ReturnOutcomeDialog {...model.sections.ReturnOutcomeDialog} />

        {/* MODAL: So sánh ảnh cạnh nhau */}
        <ReturnCompareDialog {...model.sections.ReturnCompareDialog} />

        {/* MODAL: Lập biên bản hàng xuống cấp (TH-04 / KG-16) */}
        <DegradedCaseModal {...model.sections.DegradedCaseModal} />

        {/* MODAL: Xem chi tiết nhanh yêu cầu trả hàng */}
        <ReturnQuickDetailModal
          item={model.quickDetailItem}
          onClose={() => model.setQuickDetailItem(null)}
          onOpenFullReview={model.handleOpenReview}
        />
      </div>
    </ModeratorLayout>
  );
}
